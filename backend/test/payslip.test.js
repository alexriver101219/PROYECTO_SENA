const request = require("supertest");
const jwt = require("jsonwebtoken");
const { inflateSync } = require("node:zlib");
const { createApp } = require("../app");
const User = require("../models/User");
const Empleado = require("../models/Empleado");
const Documento = require("../models/Documento");
const { payslipDetails, payrollBreakdown } = require("../services/payslip");
const { dateInBogota } = require("../utils/dates");
const positions = require("../config/laborPositions");
const app = createApp({ limits: false });
const fixedDate = new Date("2026-11-15T13:00:00Z");
const person = { _id: "507f1f77bcf86cd799439011", role: "employee", name: "Laura Gómez", email: "laura@sesha.com" };
const profile = { user: person._id, document: "93357137", position: "Supervisor", department: "Operaciones", status: "Activo", hireDate: "2023-07-28" };

test.each([
  ["Guarda de seguridad", 2600000, "2x2x2"], ["Supervisor", 3200000, "2x2x2"],
  ["Guarda canino", 2800000, "2x2x2"], ["Escolta de mercancías", 3200000, "2x2x2"],
  ["Escolta VIP", 3500000, "2x2x2"], ["Coordinador de operaciones", 4500000, "2x2x2"],
  ["Coordinador de escoltas", 4600000, "2x2x2"], ["Operador de medios tecnológicos", 2900000, "2x2x2"],
  ["Asistente administrativo", 2000000, "L-V"], ["Técnico de medios tecnológicos", 2200000, "L-V"],
  ["Tecnólogo de medios tecnológicos", 2500000, "L-V"], ["Supervisor de medios tecnológicos", 3200000, "2x2x2"],
  ["Auxiliar de tecnología", 2200000, "L-V"], ["Auxiliar de operaciones", 2000000, "L-V"],
])("%s conserva el neto de %i al discriminar el devengado y las deducciones", (position, net, schedule) => {
  const result = payslipDetails(person, { ...profile, position }, "2026-11", fixedDate);
  expect(result.net).toBe(net);
  expect(result.schedule.code).toBe(schedule);
  expect(result.deductionStatus).toBe("Salud y pensión ya descontadas");
  expect(result.health).toBe(Math.round(result.gross * 0.04));
  expect(result.pension).toBe(Math.round(result.gross * 0.04));
  expect(result.deductions).toBe(result.health + result.pension);
  expect(result.gross - result.deductions).toBe(net);
});

test("Laura recibe exactamente 3.200.000 y los descuentos salen del devengado antes de deducciones", () => {
  expect(payrollBreakdown(3200000)).toEqual({ gross: 3478260, health: 139130, pension: 139130,
    deductions: 278260, net: 3200000, healthPercent: 4, pensionPercent: 4 });
  // Estos importes requieren conciliar el redondeo individual de los aportes.
  expect(payrollBreakdown(2600000)).toMatchObject({ gross: 2826086, deductions: 226086, net: 2600000 });
  expect(payrollBreakdown(2000000)).toMatchObject({ gross: 2173914, deductions: 173914, net: 2000000 });
  for (const value of [0, -1, 3200000.5, "3200000", Number.MAX_SAFE_INTEGER]) expect(() => payrollBreakdown(value)).toThrow();
});

test("el redondeo al peso mantiene devengado menos descuentos igual a neto en límites consecutivos", () => {
  for (let net = 3199950; net <= 3200050; net++) {
    const result = payrollBreakdown(net);
    expect(Number.isSafeInteger(result.gross)).toBe(true);
    expect(result.gross - result.health - result.pension).toBe(net);
    expect(result.health).toBe(Math.round(result.gross * 0.04));
    expect(result.pension).toBe(Math.round(result.gross * 0.04));
  }
});

test("cubre todo el catálogo y reconoce tildes sin asignar valores a cargos desconocidos", () => {
  for (const job of positions) expect(payslipDetails(person, { ...profile, position: job.position }, "2026-11", fixedDate).net).toBeGreaterThan(0);
  expect(payslipDetails(person, { ...profile, position: "  TECNOLOGO DE MEDIOS TECNOLOGICOS  " }, "2026-11", fixedDate).net).toBe(2500000);
  expect(() => payslipDetails(person, { ...profile, position: "Cargo sin asignación" }, "2026-11", fixedDate)).toThrow("asignación salarial");
});

test("períodos por fecha de Colombia, sin meses futuros ni anteriores al ingreso", () => {
  expect(payslipDetails(person, profile, undefined, new Date("2026-12-01T02:00:00Z")).period).toBe("2026-11");
  for (const period of ["2026-13", "2026-00", "2099-01", "2023-06", "", { $ne: null }])
    expect(() => payslipDetails(person, profile, period, fixedDate)).toThrow();
  expect(() => payslipDetails(person, { ...profile, status: "Inactivo" }, "2026-11", fixedDate)).toThrow("activo");
});

async function employee(email, position = "Guarda de seguridad", role = "employee") {
  const user = await User.create({ name: email.startsWith("laura") ? "Laura Gómez" : "Ana Torres", email, role, password: "test-only-unused-hash" });
  const saved = await Empleado.create({ ...profile, user: user._id, name: user.name, position, document: email.startsWith("laura") ? "93357137" : "52418936" });
  const token = jwt.sign({ version: user.sessionVersion }, process.env.JWT_SECRET, { subject: user.id,
    issuer: "sesha-api", audience: "sesha-web", expiresIn: "1h" });
  return { user, profile: saved, token: "Bearer " + token };
}
function pdfText(buffer) {
  return [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/gu)].map((match) => {
    let value; try { value = inflateSync(Buffer.from(match[1], "latin1")).toString("latin1"); } catch { return ""; }
    return [...value.matchAll(/<([0-9a-f]+)>/giu)].map((part) => Buffer.from(part[1], "hex").toString("latin1")).join("");
  }).join(" ");
}

test("JWT exige sesión y el servidor usa únicamente el perfil del empleado autenticado", async () => {
  expect((await request(app).get("/api/documentos/nomina")).status).toBe(401);
  const ana = await employee("ana@sesha.com");
  const laura = await employee("laura@sesha.com", "Supervisor");
  const period = dateInBogota().slice(0, 7);
  const snapshot = await Empleado.collection.find({}).sort({ _id: 1 }).toArray();
  const own = await request(app).get(`/api/documentos/nomina?period=${period}`).set("Authorization", ana.token);
  expect(own.status).toBe(200);
  expect(own.headers["cache-control"]).toContain("no-store");
  expect(own.body).toMatchObject({ name: "Ana Torres", document: "52418936", net: 2600000, period });
  expect((await request(app).get(`/api/documentos/nomina?period=${period}&user=${laura.user.id}`).set("Authorization", ana.token)).status).toBe(400);
  expect((await request(app).get(`/api/documentos/nomina/pdf?period=${period}&net=9999999`).set("Authorization", ana.token)).status).toBe(400);
  expect((await request(app).get("/api/documentos/nomina?period[$ne]=null").set("Authorization", ana.token)).status).toBe(400);
  expect(await Empleado.collection.find({}).sort({ _id: 1 }).toArray()).toEqual(snapshot);
  expect(await Documento.countDocuments()).toBe(0);
});

test("PDF personal contiene logo, período, programación y neto exacto; no duplica descuentos", async () => {
  const laura = await employee("laura@sesha.com", "Supervisor");
  const period = dateInBogota().slice(0, 7);
  const response = await request(app).get(`/api/documentos/nomina/pdf?period=${period}`).set("Authorization", laura.token);
  expect(response.status).toBe(200);
  expect(response.headers["content-disposition"]).toContain(`desprendible-nomina-${period}-93357137.pdf`);
  expect(response.body.subarray(0, 5).toString()).toBe("%PDF-");
  const text = pdfText(response.body);
  for (const value of ["Laura Gómez", "93357137", "Supervisor", "3.478.260", "139.130", "278.260", "3.200.000",
    "DEVENGADO", "DEDUCCIONES", "TOTAL A PAGAR", "Salud (4 %)", "Pensión (4 %)", "2x2x2", "No acredita pago"])
    expect(text).toContain(value);
  expect(text).not.toContain("2.944.000");
  expect(response.body.toString("latin1")).toContain("/Subtype /Image");
});

test("acepta el parámetro interno del rewrite de Vercel solo para la ruta resuelta", async () => {
  const ana = await employee("ana@sesha.com");
  const period = dateInBogota().slice(0, 7);
  const response = await request(app).get(`/api/documentos/nomina?period=${period}&path=documentos%2Fnomina`).set("Authorization", ana.token);
  expect(response.status).toBe(200);
  expect(response.body.net).toBe(2600000);
  expect((await request(app).get(`/api/documentos/nomina/pdf?period=${period}&path=documentos%2Fnomina%2Fpdf`).set("Authorization", ana.token)).status).toBe(200);
  for (const path of ["documentos/nomina/pdf", "empleados", "", "documentos/nomina&net=1"])
    expect((await request(app).get(`/api/documentos/nomina?period=${period}&path=${encodeURIComponent(path)}`).set("Authorization", ana.token)).status).toBe(400);
});

test("perfil faltante o inactivo se explica y el rol admin no se convierte en empleado", async () => {
  const admin = await employee("admin@sesha.com", "Administrador", "admin");
  expect((await request(app).get("/api/documentos/nomina").set("Authorization", admin.token)).status).toBe(403);
  await Empleado.deleteMany({});
  const laura = await employee("laura@sesha.com");
  await Empleado.updateOne({ user: laura.user._id }, { $set: { status: "Inactivo" } });
  expect((await request(app).get("/api/documentos/nomina").set("Authorization", laura.token)).status).toBe(409);
  await Empleado.deleteOne({ user: laura.user._id });
  expect((await request(app).get("/api/documentos/nomina/pdf").set("Authorization", laura.token)).status).toBe(409);
  expect(() => payslipDetails(person, { ...profile, user: admin.user.id }, "2026-11", fixedDate)).toThrow();
});
