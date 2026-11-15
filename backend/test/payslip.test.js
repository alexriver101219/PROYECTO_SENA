const request = require("supertest");
const jwt = require("jsonwebtoken");
const { inflateSync } = require("node:zlib");
const { createApp } = require("../app");
const User = require("../models/User");
const Empleado = require("../models/Empleado");
const Documento = require("../models/Documento");
const { payslipDetails, payrollBreakdown } = require("../services/payslip");
const { payrollPeriod, latestClosedFortnight } = require("../services/payrollPeriods");
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
  expect(result.monthlyNet).toBe(net);
  expect(result.net).toBe(net / 2);
  expect(result.half).toBe("1");
  expect(result.schedule.code).toBe(schedule);
  expect(result.deductionStatus).toBe("Salud y pensión descontadas en esta quincena");
  expect(result.health).toBe(Math.round(result.gross * 0.02));
  expect(result.pension).toBe(Math.round(result.gross * 0.02));
  expect(result.deductions).toBe(result.health + result.pension);
  expect(result.gross - result.deductions).toBe(net / 2);
});

test("Laura conserva asignación mensual de 3.200.000 y recibe 1.600.000 en cada quincena", () => {
  expect(payrollBreakdown(1600000)).toEqual({ gross: 1666666, health: 33333, pension: 33333,
    deductions: 66666, net: 1600000, healthPercent: 2, pensionPercent: 2 });
  for (const half of ["1", "2"]) {
    const result = payslipDetails(person, profile, "2026-10", fixedDate, half);
    expect(result).toMatchObject({ monthlyNet: 3200000, gross: 1666666, health: 33333, pension: 33333, net: 1600000, half });
    expect(result.payment).toMatchObject({ method: "Transferencia bancaria", bank: "Bancolombia", destination: "Cuenta del empleado" });
  }
  expect(payslipDetails(person, profile, "2026-10", fixedDate).monthlyNet).toBe(3200000);
  expect(payrollBreakdown(1300000)).toMatchObject({ gross: 1354166, deductions: 54166, net: 1300000 });
  for (const value of [0, -1, 3200000.5, "3200000", Number.MAX_SAFE_INTEGER]) expect(() => payrollBreakdown(value)).toThrow();
});

test("el redondeo al peso mantiene devengado menos descuentos igual a neto en límites consecutivos", () => {
  for (let net = 3199950; net <= 3200050; net++) {
    const result = payrollBreakdown(net);
    expect(Number.isSafeInteger(result.gross)).toBe(true);
    expect(result.gross - result.health - result.pension).toBe(net);
    expect(result.health).toBe(Math.round(result.gross * 0.02));
    expect(result.pension).toBe(Math.round(result.gross * 0.02));
  }
});

test("cubre todo el catálogo y reconoce tildes sin asignar valores a cargos desconocidos", () => {
  for (const job of positions) expect(payslipDetails(person, { ...profile, position: job.position }, "2026-11", fixedDate).net).toBeGreaterThan(0);
  expect(payslipDetails(person, { ...profile, position: "  TECNOLOGO DE MEDIOS TECNOLOGICOS  " }, "2026-11", fixedDate).net).toBe(1250000);
  expect(() => payslipDetails(person, { ...profile, position: "Cargo sin asignación" }, "2026-11", fixedDate)).toThrow("asignación salarial");
});

test("períodos por fecha de Colombia, sin meses futuros ni anteriores al ingreso", () => {
  expect(payslipDetails(person, profile, undefined, new Date("2026-12-01T02:00:00Z")).period).toBe("2026-11");
  for (const period of ["2026-13", "2026-00", "2099-01", "2023-06", "", { $ne: null }])
    expect(() => payslipDetails(person, profile, period, fixedDate)).toThrow();
  expect(() => payslipDetails(person, { ...profile, status: "Inactivo" }, "2026-11", fixedDate)).toThrow("activo");
});

test("quincenas cerradas: noviembre actual no produce un mes completo ni una segunda quincena futura", () => {
  expect(payrollPeriod(undefined, undefined, fixedDate)).toMatchObject({ period: "2026-11", half: "1", periodStart: "2026-11-01", periodEnd: "2026-11-15" });
  expect(() => payrollPeriod("2026-11", "2", fixedDate)).toThrow("aún no ha terminado");
  for (const half of ["0", "3", "", 1, ["1"], { $ne: null }]) expect(() => payrollPeriod("2026-11", half, fixedDate)).toThrow();
  expect(latestClosedFortnight(new Date("2026-11-14T18:00:00Z"))).toEqual({ period: "2026-10", half: "2" });
  expect(latestClosedFortnight(new Date("2026-11-16T02:00:00Z"))).toEqual({ period: "2026-11", half: "1" });
  expect(payrollPeriod("2024-02", "2", fixedDate).periodEnd).toBe("2024-02-29");
  expect(payrollPeriod("2025-02", "2", fixedDate).periodEnd).toBe("2025-02-28");
  expect(payrollPeriod("2026-10", "2", fixedDate).periodEnd).toBe("2026-10-31");
});

test("las dos quincenas conservan el mensual; el ingreso parcial requiere revisión", () => {
  const first = payslipDetails(person, profile, "2026-10", fixedDate, "1");
  const second = payslipDetails(person, profile, "2026-10", fixedDate, "2");
  expect(first.net + second.net).toBe(3200000);
  expect(() => payslipDetails(person, { ...profile, hireDate: "2026-11-10" }, "2026-11", fixedDate, "1")).toThrow("días trabajados");
});

async function employee(email, position = "Guarda de seguridad", role = "employee") {
  const user = await User.create({ name: email.startsWith("laura") ? "Laura Gómez" : "Ana Torres", email, role, password: "test-only-unused-hash" });
  const saved = await Empleado.create({ ...profile, user: user._id, name: user.name, position,
    document: email.startsWith("laura") ? "93357137" : "52418936" });
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
  const period = latestClosedFortnight().period;
  const snapshot = await Empleado.collection.find({}).sort({ _id: 1 }).toArray();
  const own = await request(app).get(`/api/documentos/nomina?period=${period}`).set("Authorization", ana.token);
  expect(own.status).toBe(200);
  expect(own.headers["cache-control"]).toContain("no-store");
  expect(own.body).toMatchObject({ name: "Ana Torres", document: "52418936", monthlyNet: 2600000, net: 1300000, period });
  expect((await request(app).get(`/api/documentos/nomina?period=${period}&user=${laura.user.id}`).set("Authorization", ana.token)).status).toBe(400);
  expect((await request(app).get(`/api/documentos/nomina/pdf?period=${period}&net=9999999`).set("Authorization", ana.token)).status).toBe(400);
  expect((await request(app).get("/api/documentos/nomina?period[$ne]=null").set("Authorization", ana.token)).status).toBe(400);
  expect(await Empleado.collection.find({}).sort({ _id: 1 }).toArray()).toEqual(snapshot);
  expect(await Documento.countDocuments()).toBe(0);
});

test("PDF personal contiene logo, período, programación y neto exacto; no duplica descuentos", async () => {
  const laura = await employee("laura@sesha.com", "Supervisor");
  const { period, half } = latestClosedFortnight();
  const response = await request(app).get(`/api/documentos/nomina/pdf?period=${period}`).set("Authorization", laura.token);
  expect(response.status).toBe(200);
  expect(response.headers["content-disposition"]).toContain(`desprendible-nomina-${period}-Q${half}-93357137.pdf`);
  expect(response.body.subarray(0, 5).toString()).toBe("%PDF-");
  const text = pdfText(response.body);
  for (const value of ["Laura Gómez", "93357137", "Supervisor", "3.200.000", "1.666.666", "33.333", "66.666", "1.600.000",
    "ASIGNACIÓN MENSUAL NETA", "DEVENGADO", "DEDUCCIONES", "TOTAL A PAGAR", "Salud (2 %)", "Pensión (2 %)",
    "2x2x2", "Bancolombia", "Transferencia bancaria", "Sin validación bancaria"])
    expect(text).toContain(value);
  expect(text).not.toContain("3.600.000");
  expect(response.body.toString("latin1")).toContain("/Subtype /Image");
});

test("acepta el parámetro interno del rewrite de Vercel solo para la ruta resuelta", async () => {
  const ana = await employee("ana@sesha.com");
  const period = latestClosedFortnight().period;
  const response = await request(app).get(`/api/documentos/nomina?period=${period}&path=documentos%2Fnomina`).set("Authorization", ana.token);
  expect(response.status).toBe(200);
  expect(response.body.net).toBe(1300000);
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
