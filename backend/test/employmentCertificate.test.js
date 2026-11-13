const request = require("supertest");
const jwt = require("jsonwebtoken");
const { inflateSync } = require("zlib");
const { createApp } = require("../app");
const User = require("../models/User");
const Empleado = require("../models/Empleado");
const { certificateDetails } = require("../services/employmentCertificate");
const { completeLaborProfiles } = require("../services/laborProfiles");
const { dateInBogota, longDate } = require("../utils/dates");
const { vi } = globalThis;
const app = createApp({ limits: false });

function pdfText(buffer) {
  const source = buffer.toString("latin1");
  return [...source.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
    .map((match) => {
      let content;
      try {
        content = inflateSync(Buffer.from(match[1], "latin1")).toString(
          "latin1",
        );
      } catch {
        content = match[1];
      }
      return [...content.matchAll(/<([0-9a-f]+)>/gi)]
        .map((part) => Buffer.from(part[1], "hex").toString("latin1"))
        .join("");
    })
    .join(" ");
}

async function account(email, name = "Ana Torres") {
  return User.create({
    name,
    email,
    password: "hash-sintetico",
    role: "employee",
  });
}

test("la constancia laboral usa la identidad autenticada, sus datos y la fecha actual", async () => {
  const user = await account("ana@sesha.com");
  await Empleado.create({
    user: user._id,
    name: "Nombre alternativo del perfil",
    document: "1012345678",
    position: "Supervisora",
    department: "Operaciones",
    hireDate: "2021-03-15",
  });
  const token = jwt.sign({}, process.env.JWT_SECRET, {
    subject: user.id,
    issuer: "sesha-api",
    audience: "sesha-web",
    expiresIn: "1h",
  });
  const response = await request(app)
    .get("/api/documentos/certificado?name=Intruso&document=9999999999")
    .set("Authorization", "Bearer " + token);
  expect(response.status).toBe(200);
  expect(response.headers["content-disposition"]).toContain(
    "constancia-laboral-1012345678.pdf",
  );
  const text = pdfText(response.body);
  for (const expected of [
    "Sesha",
    "CONSTANCIA LABORAL",
    "Ana Torres",
    "1012345678",
    "Supervisora",
    "15 de marzo de 2021",
    "Mariana Isabel Torres Ríos",
    "Directora de Talento Humano",
    "Firma ficticia",
    longDate(dateInBogota()),
  ])
    expect(text).toContain(expected);
  expect(text).not.toContain("Intruso");
  expect(text).not.toContain("Constancia académica");
  expect(response.body.toString("latin1")).toContain("/Subtype /Image");
});

test("la fecha de expedición cambia por el día de Colombia y la de ingreso permanece fija", () => {
  const user = { name: "Ana Torres" },
    profile = {
      name: "Ana",
      document: "1012345678",
      position: "Analista",
      department: "Operaciones",
      status: "Activo",
      hireDate: "2021-03-15",
    };
  const night = certificateDetails(
    user,
    profile,
    new Date("2026-11-13T02:30:00Z"),
  );
  const morning = certificateDetails(
    user,
    profile,
    new Date("2026-11-13T05:01:00Z"),
  );
  expect(night.issuedDate).toBe("2026-11-12");
  expect(morning.issuedDate).toBe("2026-11-13");
  expect(night.hireDate).toBe(morning.hireDate);
  expect(() =>
    certificateDetails(user, { ...profile, hireDate: "2026-02-30" }),
  ).toThrow();
  expect(() =>
    certificateDetails(user, { ...profile, hireDate: "2099-01-01" }),
  ).toThrow();
});

test("completar perfiles cubre todos los usuarios y conserva los datos válidos", async () => {
  const first = await account("primero@sesha.com"),
    second = await account("segundo@sesha.com", "Laura Gómez");
  const saved = await Empleado.create({
    user: first._id,
    name: first.name,
    document: "1098765432",
    position: "Coordinadora",
    department: "Administración",
    hireDate: "2020-02-20",
  });
  const plan = await completeLaborProfiles();
  expect(plan.missingProfiles).toBe(1);
  await completeLaborProfiles({ apply: true });
  const preserved = await Empleado.findById(saved.id);
  expect(preserved.document).toBe("1098765432");
  expect(preserved.position).toBe("Coordinadora");
  expect(preserved.hireDate).toBe("2020-02-20");
  expect(await Empleado.countDocuments()).toBe(2);
  const created = await Empleado.findOne({ user: second._id });
  expect(created.document).toMatch(/^\d{10}$/);
  expect(created.hireDate < dateInBogota()).toBe(true);
  expect((await completeLaborProfiles()).missingProfiles).toBe(0);
  await completeLaborProfiles({ apply: true });
  expect((await Empleado.findById(created.id)).hireDate).toBe(created.hireDate);
});

test("el registro prepara el perfil y revierte la cuenta si falla su creación", async () => {
  const credentials = {
    name: "Nueva Persona",
    email: "nueva@sesha.com",
    password: "123456",
    position: "Auxiliar de tecnología",
  };
  const response = await request(app)
    .post("/api/auth/register")
    .send(credentials);
  expect(response.status).toBe(201);
  const profile = await Empleado.findOne({ user: response.body.user.id });
  expect(profile.name).toBe(credentials.name);
  expect(profile.position).toBe(credentials.position);
  expect(profile.department).toBe("Tecnología");
  expect((await request(app).get("/api/auth/positions")).body).toContainEqual({
    position: "Auxiliar de tecnología",
    department: "Tecnología",
  });
  const me = await request(app)
    .get("/api/auth/me")
    .set("Cookie", response.headers["set-cookie"]);
  expect(me.body.profile.position).toBe(credentials.position);
  expect(profile.hireDate < dateInBogota()).toBe(true);
  const failure = vi
    .spyOn(Empleado, "create")
    .mockRejectedValueOnce(new Error("synthetic profile failure"));
  try {
    expect(
      (
        await request(app)
          .post("/api/auth/register")
          .send({ ...credentials, email: "fallo@sesha.com" })
      ).status,
    ).toBe(500);
    expect(await User.exists({ email: "fallo@sesha.com" })).toBeNull();
  } finally {
    failure.mockRestore();
  }
});

test("el catálogo publica los ocho cargos nuevos y el registro conserva cargo, área y rol employee", async () => {
  const jobs = [
    ["Escolta de mercancías", "Operaciones"], ["Escolta VIP", "Operaciones"],
    ["Operador de medios tecnológicos", "Tecnología"], ["Coordinador de escoltas", "Operaciones"],
    ["Técnico de medios tecnológicos", "Tecnología"], ["Supervisor de medios tecnológicos", "Tecnología"],
    ["Guarda canino", "Operaciones"], ["Auxiliar de almacén", "Administración"],
  ];
  const options = await request(app).get("/api/auth/positions");
  expect(options.status).toBe(200);
  for (const [index, [position, department]] of jobs.entries()) {
    expect(options.body).toContainEqual({ position, department });
    const response = await request(app).post("/api/auth/register").send({
      name: "Nuevo cargo " + index, email: `cargo${index}@sesha.com`, password: "Sesha2026!", position,
    });
    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe("employee");
    const profile = await Empleado.findOne({ user: response.body.user.id });
    expect(profile.position).toBe(position);
    expect(profile.department).toBe(department);
  }
});
