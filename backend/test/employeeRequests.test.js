const request = require("supertest");
const jwt = require("jsonwebtoken");
const { createApp } = require("../app");
const User = require("../models/User");
const Empleado = require("../models/Empleado");
const Solicitud = require("../models/Solicitud");
const { employeeRequestTypes } = require("../config/requestTypes");
const { dateInBogota } = require("../utils/dates");
const { employeeRequestData } = require("../services/employeeRequests");
const app = createApp({ limits: false });
async function fixture(role = "employee", suffix = "1", withProfile = true) {
  const user = await User.create({ name: "Ana Torres", email: `ana${suffix}@sesha.com`, role, password: "test-only-hash-placeholder" });
  if (role === "employee" && withProfile) await Empleado.create({ user: user._id, name: user.name, document: "5241893" + suffix,
    position: "Guarda de seguridad", department: "Operaciones", status: "Activo" });
  return { user, header: "Bearer " + jwt.sign({}, process.env.JWT_SECRET, {
    subject: String(user._id), issuer: "sesha-api", audience: "sesha-web", expiresIn: "1h",
  }) };
}
const post = (auth, body) => request(app).post("/api/solicitudes").set("Authorization", auth.header).send(body);
const body = () => ({ tipo: "Permiso remunerado", descripcion: "Permiso para cita médica", fechaPermiso: dateInBogota() });

test("el formulario devuelve identidad propia, fecha de Bogotá y cuatro tipos; exige sesión y perfil activo", async () => {
  const auth = await fixture(), admin = await fixture("admin", "2");
  expect((await request(app).get("/api/solicitudes/formulario")).status).toBe(401);
  const response = await request(app).get("/api/solicitudes/formulario?path=solicitudes/formulario").set("Authorization", auth.header);
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ employee: { name: "Ana Torres", document: "52418931", email: "ana1@sesha.com", position: "Guarda de seguridad", department: "Operaciones" },
    requestDate: dateInBogota(), types: employeeRequestTypes });
  expect((await request(app).get("/api/solicitudes/formulario?path=otro").set("Authorization", auth.header)).status).toBe(400);
  expect((await request(app).get("/api/solicitudes/formulario").set("Authorization", admin.header)).status).toBe(403);
  await Empleado.updateOne({ user: auth.user._id }, { status: "Inactivo" });
  expect((await request(app).get("/api/solicitudes/formulario").set("Authorization", auth.header)).status).toBe(409);
  expect((await post(auth, body())).status).toBe(409);
  const missing = await fixture("employee", "3", false);
  expect((await post(missing, body())).status).toBe(409);
});

test.each(employeeRequestTypes)("%s persiste identidad y fechas del servidor y aparece en historial propio y administrativo", async (tipo) => {
  const auth = await fixture(), other = await fixture("employee", "2"), admin = await fixture("admin", "3");
  const payload = { ...body(), tipo, fechaPermiso: tipo === "Ajuste de nómina" ? null : dateInBogota() };
  const response = await post(auth, payload);
  expect(response.status).toBe(201);
  expect(response.body).toMatchObject({ tipo, estado: "Pendiente", fechaSolicitud: dateInBogota(), fechaPermiso: payload.fechaPermiso,
    empleado: { name: "Ana Torres", document: "52418931", email: "ana1@sesha.com" } });
  const saved = await Solicitud.findById(response.body.id);
  expect(String(saved.owner)).toBe(String(auth.user._id));
  expect(saved.empleado.document).toBe("52418931");
  await Empleado.updateOne({ user: auth.user._id }, { document: "83456789" });
  const own = await request(app).get("/api/solicitudes").set("Authorization", auth.header);
  expect(own.body.items[0].empleado.document).toBe("52418931");
  expect((await request(app).get("/api/solicitudes").set("Authorization", other.header)).body.total).toBe(0);
  const all = await request(app).get("/api/solicitudes").set("Authorization", admin.header);
  expect(all.body.items[0].owner).toMatchObject({ name: "Ana Torres", email: "ana1@sesha.com" });
  expect((await request(app).put("/api/solicitudes/" + saved.id).set("Authorization", auth.header).send({ estado: "Aprobado" })).status).toBe(403);
  expect((await request(app).put("/api/solicitudes/" + saved.id).set("Authorization", admin.header).send({ estado: "Aprobado" })).status).toBe(200);
  expect((await request(app).delete("/api/solicitudes/" + saved.id).set("Authorization", auth.header)).status).toBe(404);
});

test("rechaza fechas inválidas, pasadas y datos personales o estado falsificados, sin escribir solicitudes", async () => {
  const auth = await fixture();
  for (const fechaPermiso of [undefined, null, "N/A", "2026-02-30", "2020-01-01", { $ne: null }])
    expect((await post(auth, { ...body(), fechaPermiso })).status).toBe(400);
  for (const extra of [{ owner: auth.user.id }, { empleado: { name: "Otra persona" } }, { fechaSolicitud: "2020-01-01" }, { estado: "Aprobado" }])
    expect((await post(auth, { ...body(), ...extra })).status).toBe(400);
  expect((await post(auth, { ...body(), tipo: "Ajuste de nómina" })).status).toBe(400);
  expect(await Solicitud.countDocuments()).toBe(0);
});

test("la fecha de radicación usa Bogotá en el límite del día; ajustes admiten N/A y permisos una fecha futura", () => {
  const user = { _id: "account", name: "Ana", email: "ana@sesha.com", role: "employee" };
  const profile = { user: "account", status: "Activo", document: "52418931", position: "Supervisor", department: "Operaciones" };
  const now = new Date("2026-11-16T02:00:00Z");
  expect(employeeRequestData(user, profile, { tipo: "Ajuste de nómina" }, now)).toMatchObject({ fechaSolicitud: "2026-11-15", fechaPermiso: null });
  expect(employeeRequestData(user, profile, { tipo: "Día de la familia", fechaPermiso: "2026-12-01" }, now).fechaPermiso).toBe("2026-12-01");
});

test("el soporte es opcional, debe pertenecer al solicitante y sigue protegido mientras esté referenciado", async () => {
  const auth = await fixture(), other = await fixture("employee", "2");
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n");
  const upload = await request(app).post("/api/documentos").set("Authorization", auth.header).attach("file", pdf, "soporte.pdf");
  expect(upload.status).toBe(201);
  expect((await post(other, { ...body(), documento: upload.body.id })).status).toBe(404);
  const response = await post(auth, { ...body(), documento: upload.body.id });
  expect(response.status).toBe(201);
  expect(response.body.documento.nombre).toBe("soporte.pdf");
  expect((await request(app).delete("/api/documentos/" + upload.body.id).set("Authorization", auth.header)).status).toBe(409);
  expect((await request(app).delete("/api/solicitudes/" + response.body.id).set("Authorization", auth.header)).status).toBe(204);
  expect((await request(app).delete("/api/documentos/" + upload.body.id).set("Authorization", auth.header)).status).toBe(204);
});

test("los trámites anteriores siguen siendo legibles y compatibles", async () => {
  const auth = await fixture("employee", "1", false);
  const old = await Solicitud.create({ owner: auth.user._id, tipo: "Permiso", descripcion: "Registro anterior sin fecha de permiso" });
  expect(old.fechaPermiso).toBeUndefined();
  expect((await request(app).get("/api/solicitudes").set("Authorization", auth.header)).body.items[0].id).toBe(old.id);
  expect((await post(auth, { tipo: "Vacaciones", descripcion: "Solicitud anterior compatible" })).status).toBe(201);
});
