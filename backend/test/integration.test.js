const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createApp } = require("../app");
const User = require("../models/User");
const Empleado = require("../models/Empleado");
const Documento = require("../models/Documento");
const Solicitud = require("../models/Solicitud");
const { MongoRateLimitStore } = require("../services/rateLimitStore");
const { validateConfig } = require("../config/env");
const app = createApp({ limits: false });
const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n",
);
const profile = {
  name: "Empleado Prueba",
  document: "1012345678",
  position: "Supervisor",
  department: "Operaciones",
  status: "Activo",
};
async function fixture(role = "employee", email = "ana@sesha.com") {
  const account = await User.create({
    name: "Ana Prueba",
    email,
    role,
    password: await bcrypt.hash("test-only-fixture-0-credentials", 4),
  });
  const token = jwt.sign({}, process.env.JWT_SECRET, {
    subject: String(account._id),
    issuer: "sesha-api",
    audience: "sesha-web",
    expiresIn: "1h",
  });
  return { account, header: "Bearer " + token };
}
async function upload(auth) {
  return request(app)
    .post("/api/documentos")
    .set("Authorization", auth.header)
    .attach("file", pdf, "prueba.pdf");
}
test("registro persistido: cookie HttpOnly, sin JWT ni hash en respuesta y duplicados rechazados", async () => {
  const credentials = {
    name: "Ana Díaz",
    email: "ANA@sesha.com",
    password: "test-only-fixture-0-credentials",
  };
  const response = await request(app)
    .post("/api/auth/register")
    .send(credentials);
  expect(response.status).toBe(201);
  expect(response.body.user.email).toBe("ana@sesha.com");
  expect(response.body.user.password).toBeUndefined();
  expect(response.body.token).toBeUndefined();
  expect(response.headers["set-cookie"][0]).toMatch(/HttpOnly/);
  expect(response.headers["set-cookie"][0]).toMatch(/SameSite=Strict/);
  expect(await User.countDocuments()).toBe(1);
  const duplicate = await request(app)
    .post("/api/auth/register")
    .send(credentials);
  expect(duplicate.status).toBe(409);
  expect(duplicate.headers["set-cookie"]).toBeUndefined();
});
test("registro rechaza privilegios, operadores y contraseñas cortas", async () => {
  const valid = {
    name: "Ana Díaz",
    email: "ana@sesha.com",
    password: "test-only-fixture-0-credentials",
  };
  for (const body of [
    { ...valid, role: "admin" },
    { ...valid, password: "x" },
    { ...valid, email: { $ne: null } },
    { ...valid, position: "Cargo inexistente" },
    { ...valid, position: "Administrador" },
    { ...valid, position: { $ne: null } },
  ]) {
    expect(
      (await request(app).post("/api/auth/register").send(body)).status,
    ).toBe(400);
  }
  expect(await User.countDocuments()).toBe(0);
});
test("la clave académica funciona únicamente para una cuenta persistida; logout exige CSRF", async () => {
  const credentials = { email: "admin@sesha.com", password: "test-only-fixture-0-credentials" };
  expect(
    (await request(app).post("/api/auth/login").send(credentials)).status,
  ).toBe(401);
  await fixture("admin", credentials.email);
  const response = await request(app).post("/api/auth/login").send(credentials);
  expect(response.status).toBe(200);
  expect(response.body.user.role).toBe("admin");
  const cookie = response.headers["set-cookie"];
  expect(
    (await request(app).get("/api/auth/me").set("Cookie", cookie)).status,
  ).toBe(200);
  expect(
    (await request(app).post("/api/auth/logout").set("Cookie", cookie)).status,
  ).toBe(403);
  const logout = await request(app)
    .post("/api/auth/logout")
    .set("Cookie", cookie)
    .set("X-CSRF-Token", response.body.csrfToken);
  expect(logout.status).toBe(204);
  expect(
    (await request(app).get("/api/auth/me").set("Cookie", cookie)).status,
  ).toBe(401);
  expect(logout.headers["set-cookie"][0]).toMatch(/Expires=Thu, 01 Jan 1970/);
});
test("JWT falso, expirado y cuenta deshabilitada no dan acceso", async () => {
  const user = await fixture();
  const expired = jwt.sign({}, process.env.JWT_SECRET, {
    subject: String(user.account._id),
    issuer: "sesha-api",
    audience: "sesha-web",
    expiresIn: -1,
  });
  for (const token of ["falso", expired])
    expect(
      (
        await request(app)
          .get("/api/auth/me")
          .set("Authorization", "Bearer " + token)
      ).status,
    ).toBe(401);
  user.account.active = false;
  await user.account.save();
  expect(
    (await request(app).get("/api/auth/me").set("Authorization", user.header))
      .status,
  ).toBe(401);
});
test("sin BD devuelve 503 sin filtrar el error; distingue vida y disponibilidad", async () => {
  const offline = createApp({
    database: async () => {
      throw new Error("private synthetic details");
    },
    limits: false,
  });
  const res = await request(offline).post("/api/documentos").send({});
  expect(res.status).toBe(503);
  expect(JSON.stringify(res.body)).not.toContain("private");
  expect((await request(offline).get("/api/health")).status).toBe(200);
  expect((await request(offline).get("/api/ready")).status).toBe(503);
});
test("validación de CORS, JSON y configuración obligatoria", async () => {
  expect(
    (
      await request(app)
        .get("/api/health")
        .set("Origin", "https://untrusted.example")
    ).status,
  ).toBe(403);
  const malformed = await request(app)
    .post("/api/auth/login")
    .type("json")
    .send('{"email":');
  expect(malformed.status).toBe(400);
  const old = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "short";
  expect(validateConfig).toThrow();
  process.env.JWT_SECRET = old;
});
test("solo admin gestiona perfiles; los modelos y hashes permanecen separados", async () => {
  const employee = await fixture(),
    admin = await fixture("admin", "admin@sesha.com");
  expect((await request(app).get("/api/empleados")).status).toBe(401);
  expect(
    (
      await request(app)
        .post("/api/empleados")
        .set("Authorization", employee.header)
        .send(profile)
    ).status,
  ).toBe(403);
  const created = await request(app)
    .post("/api/empleados")
    .set("Authorization", admin.header)
    .send({ ...profile, email: employee.account.email });
  expect(created.status).toBe(201);
  expect(created.body.user.email).toBe(employee.account.email);
  expect(created.body.document).toBe(profile.document);
  expect(User).not.toBe(Empleado);
  const list = await request(app)
    .get("/api/empleados")
    .set("Authorization", admin.header);
  expect(list.body.total).toBe(1);
  expect(JSON.stringify(list.body)).not.toContain("password");
  const updated = await request(app)
    .put("/api/empleados/" + created.body.id)
    .set("Authorization", admin.header)
    .send({ ...profile, position: "Coordinador" });
  expect(updated.status).toBe(200);
  expect((await Empleado.findById(created.body.id)).position).toBe(
    "Coordinador",
  );
});
test("perfiles rechazan duplicados, campos inesperados e identificadores inválidos", async () => {
  const admin = await fixture("admin", "admin@sesha.com");
  await request(app)
    .post("/api/empleados")
    .set("Authorization", admin.header)
    .send(profile);
  expect(
    (
      await request(app)
        .post("/api/empleados")
        .set("Authorization", admin.header)
        .send(profile)
    ).status,
  ).toBe(409);
  expect(
    (
      await request(app)
        .post("/api/empleados")
        .set("Authorization", admin.header)
        .send({ ...profile, role: "admin" })
    ).status,
  ).toBe(400);
  expect(
    (
      await request(app)
        .put("/api/empleados/bad")
        .set("Authorization", admin.header)
        .send(profile)
    ).status,
  ).toBe(400);
  expect(
    (
      await request(app)
        .get("/api/empleados?limit=999")
        .set("Authorization", admin.header)
    ).status,
  ).toBe(400);
});
test("PDF persiste y solo propietario o admin lo descargan y eliminan", async () => {
  const owner = await fixture(),
    other = await fixture("employee", "otro@sesha.com"),
    admin = await fixture("admin", "admin@sesha.com");
  expect(
    (
      await request(app)
        .post("/api/documentos")
        .attach("file", pdf, "prueba.pdf")
    ).status,
  ).toBe(401);
  const created = await upload(owner);
  expect(created.status).toBe(201);
  expect(created.body.data).toBeUndefined();
  expect(
    (await Documento.findById(created.body.id).select("+data")).data.equals(
      pdf,
    ),
  ).toBe(true);
  const path = "/api/documentos/" + created.body.id;
  expect(
    (
      await request(app)
        .get(path + "/download")
        .set("Authorization", other.header)
    ).status,
  ).toBe(404);
  expect(
    (await request(app).delete(path).set("Authorization", other.header)).status,
  ).toBe(404);
  expect(
    (
      await request(app)
        .get("/api/documentos")
        .set("Authorization", other.header)
    ).body.total,
  ).toBe(0);
  for (const auth of [owner, admin]) {
    const downloaded = await request(app)
      .get(path + "/download")
      .set("Authorization", auth.header);
    expect(downloaded.status).toBe(200);
    expect(downloaded.headers["content-disposition"]).toContain("attachment");
    expect(downloaded.body.equals(pdf)).toBe(true);
  }
  expect(
    (await request(app).delete(path).set("Authorization", owner.header)).status,
  ).toBe(204);
  expect(await Documento.countDocuments()).toBe(0);
});
test("rechaza PDF falso y archivos superiores a 3 MB", async () => {
  const owner = await fixture();
  expect(
    (
      await request(app)
        .post("/api/documentos")
        .set("Authorization", owner.header)
        .attach("file", Buffer.from("<script>bad</script>"), {
          filename: "falso.pdf",
          contentType: "application/pdf",
        })
    ).status,
  ).toBe(400);
  expect(
    (
      await request(app)
        .post("/api/documentos")
        .set("Authorization", owner.header)
        .attach("file", Buffer.alloc(3 * 1024 * 1024 + 1), {
          filename: "grande.pdf",
          contentType: "application/pdf",
        })
    ).status,
  ).toBe(400);
  expect(await Documento.countDocuments()).toBe(0);
});
test("constancia se genera con el perfil autenticado", async () => {
  const owner = await fixture();
  expect(
    (
      await request(app)
        .get("/api/documentos/certificado")
        .set("Authorization", owner.header)
    ).status,
  ).toBe(409);
  await Empleado.create({ ...profile, user: owner.account._id });
  const res = await request(app)
    .get("/api/documentos/certificado")
    .set("Authorization", owner.header);
  expect(res.status).toBe(200);
  expect(res.body.subarray(0, 5).toString()).toBe("%PDF-");
});
test("solicitudes persisten, aíslan propietarios y solo admin aprueba", async () => {
  const owner = await fixture(),
    other = await fixture("employee", "otro@sesha.com"),
    admin = await fixture("admin", "admin@sesha.com");
  expect((await request(app).get("/api/solicitudes")).status).toBe(401);
  const created = await request(app)
    .post("/api/solicitudes")
    .set("Authorization", owner.header)
    .send({ tipo: "Permiso", descripcion: "Cita médica" });
  expect(created.status).toBe(201);
  expect(await Solicitud.countDocuments()).toBe(1);
  expect(
    (
      await request(app)
        .get("/api/solicitudes")
        .set("Authorization", other.header)
    ).body.items,
  ).toEqual([]);
  const path = "/api/solicitudes/" + created.body.id;
  expect(
    (
      await request(app)
        .put(path)
        .set("Authorization", owner.header)
        .send({ estado: "Aprobado" })
    ).status,
  ).toBe(403);
  expect(
    (await request(app).delete(path).set("Authorization", other.header)).status,
  ).toBe(404);
  expect(
    (
      await request(app)
        .put(path)
        .set("Authorization", admin.header)
        .send({ estado: "Aprobado" })
    ).status,
  ).toBe(200);
  expect(
    (await request(app).delete(path).set("Authorization", owner.header)).status,
  ).toBe(404);
  expect(
    (await request(app).delete(path).set("Authorization", admin.header)).status,
  ).toBe(204);
});
test("el soporte debe ser propio y no se borra mientras esté referenciado", async () => {
  const owner = await fixture(),
    other = await fixture("employee", "otro@sesha.com");
  const doc = await upload(owner);
  const data = {
    tipo: "Permiso",
    descripcion: "Solicitud con soporte",
    documento: doc.body.id,
  };
  expect(
    (
      await request(app)
        .post("/api/solicitudes")
        .set("Authorization", other.header)
        .send(data)
    ).status,
  ).toBe(404);
  expect(
    (
      await request(app)
        .post("/api/solicitudes")
        .set("Authorization", owner.header)
        .send({ ...data, owner: other.account.id })
    ).status,
  ).toBe(400);
  expect(
    (
      await request(app)
        .post("/api/solicitudes")
        .set("Authorization", owner.header)
        .send(data)
    ).status,
  ).toBe(201);
  expect(
    (
      await request(app)
        .delete("/api/documentos/" + doc.body.id)
        .set("Authorization", owner.header)
    ).status,
  ).toBe(409);
});
test("dashboard calcula métricas desde datos persistidos y filtra por usuario", async () => {
  const owner = await fixture(),
    other = await fixture("employee", "otro@sesha.com");
  await request(app)
    .post("/api/solicitudes")
    .set("Authorization", owner.header)
    .send({ tipo: "Permiso", descripcion: "Consulta médica" });
  expect(
    (
      await request(app)
        .get("/api/dashboard")
        .set("Authorization", owner.header)
    ).body.solicitudes,
  ).toBe(1);
  expect(
    (
      await request(app)
        .get("/api/dashboard")
        .set("Authorization", other.header)
    ).body.solicitudes,
  ).toBe(0);
});
test("limitación de intentos compartida entre instancias", async () => {
  const one = createApp(),
    two = createApp();
  for (let index = 0; index < 20; index++)
    expect(
      (
        await request(index % 2 ? one : two)
          .post("/api/auth/login")
          .send({})
      ).status,
    ).toBe(400);
  expect((await request(two).post("/api/auth/login").send({})).status).toBe(
    429,
  );
});
test("el contador compartido es atómico bajo concurrencia", async () => {
  const one = new MongoRateLimitStore("concurrent"),
    two = new MongoRateLimitStore("concurrent");
  one.init({ windowMs: 60000 });
  two.init({ windowMs: 60000 });
  const values = await Promise.all(
    Array.from({ length: 10 }, (_, i) => (i % 2 ? one : two).increment("user")),
  );
  expect(Math.max(...values.map((value) => value.totalHits))).toBe(10);
});
test("migración y semilla son repetibles y conservan las contraseñas existentes", async () => {
  const { migrate } = require("../scripts/migrate");
  const { seed } = require("../scripts/seed");
  await User.collection.createIndex({ username: 1 }, { name: "username_1" });
  const legacy = await User.collection.insertOne({
    nombre: "Perfil Histórico",
    email: "historico@sesha.com",
    password: await bcrypt.hash("654321", 4),
    documento: "1098765432",
    cargo: "Supervisor",
  });
  await migrate();
  await seed();
  const admin = await User.findOne({ email: "admin@sesha.com" }).select(
    "+password",
  );
  expect(await bcrypt.compare("test-only-fixture-0-credentials", admin.password)).toBe(true);
  expect(admin.role).toBe("admin");
  expect((await User.findById(legacy.insertedId)).name).toBe(
    "Perfil Histórico",
  );
  expect(await Empleado.countDocuments({ user: legacy.insertedId })).toBe(1);
  expect(
    (await User.collection.indexes()).some(
      (index) => index.name === "username_1",
    ),
  ).toBe(false);
  const originalHash = admin.password;
  await migrate();
  await seed();
  expect((await User.findById(admin.id).select("+password")).password).toBe(
    originalHash,
  );
  expect(await User.countDocuments()).toBe(4);
  expect(await Empleado.countDocuments()).toBe(4);
});

test("entrada serverless conserva rutas y rechaza archivos historicos sin contenido", async () => {
  const handler = require("../../api/index");
  expect((await request(handler).get("/api/health")).status).toBe(200);
  const admin = await fixture("admin", "admin@sesha.com");
  expect(
    (
      await request(handler)
        .get("/api/auth/me")
        .set("Authorization", admin.header)
    ).status,
  ).toBe(200);
  const old = await Documento.collection.insertOne({
    nombre: "historico.pdf",
    tipo: "PDF",
  });
  expect(
    (
      await request(app)
        .get("/api/documentos/" + old.insertedId + "/download")
        .set("Authorization", admin.header)
    ).status,
  ).toBe(410);
  const entry = require.resolve("../../api/index");
  delete require.cache[entry];
  const unconfigured = require(entry);
  const previousSecret = process.env.JWT_SECRET;
  try {
    process.env.JWT_SECRET = "";
    const unavailable = await request(unconfigured).get("/api/health");
    expect(unavailable.status).toBe(503);
    expect(unavailable.body.message).toContain("variables de entorno");
  } finally {
    process.env.JWT_SECRET = previousSecret;
    delete require.cache[entry];
  }
});
