const mongoose = require("mongoose");
const Empleado = require("../models/Empleado");
const User = require("../models/User");
const { buildGuardPlan, applyGuardPlan, stateHash } = require("../services/securityGuardRedistribution");
const { vi } = globalThis;

async function fixture() {
  const user = await User.create({ name: "Persona de prueba", email: "persona@sesha.com", password: "hash-sintetico", role: "employee" });
  const otherJobs = [
    ["Coordinador de operaciones", 4], ["Asistente administrativo", 4],
    ["Auxiliar de tecnología", 4], ["Supervisor", 4],
    ["Auxiliar de operaciones", 6], ["Analista de talento humano", 2],
  ];
  const positions = ["Administrador", ...Array(127).fill("Guarda de seguridad"), ...otherJobs.flatMap(([position, count]) => Array(count).fill(position))];
  await Empleado.insertMany(positions.map((position, index) => ({
    name: "Perfil sintético " + index, document: String(70000000 + index),
    position, department: "Operaciones", hireDate: "2021-05-10", status: "Activo",
    ...(index === 100 ? { user: user._id } : {}),
  })));
  return Empleado.find().lean();
}

test("redistribuye solo 44 guardas, conserva identidad y otros cargos y no se aplica dos veces", async () => {
  const before = await fixture();
  const accounts = await User.find().select("+password").lean();
  const plan = buildGuardPlan(before);
  expect(plan.changes).toHaveLength(44);
  expect(stateHash(await Empleado.find().lean())).toBe(plan.beforeHash);
  const result = await mongoose.connection.transaction(session => applyGuardPlan(plan, session));
  expect(result).toMatchObject({ total: 152, changes: 44, alreadyApplied: false, counts: {
    "Guarda de seguridad": 83, "Escolta de mercancías": 6, "Escolta VIP": 6,
    "Operador de medios tecnológicos": 4, "Coordinador de escoltas": 2,
    "Técnico de medios tecnológicos": 2, "Supervisor de medios tecnológicos": 2,
    "Guarda canino": 20, "Auxiliar de almacén": 2, "Administrador": 1,
    "Coordinador de operaciones": 4, "Asistente administrativo": 4,
    "Auxiliar de tecnología": 4, "Supervisor": 4, "Auxiliar de operaciones": 6,
    "Analista de talento humano": 2,
  } });
  const byId = new Map(before.map(profile => [String(profile._id), profile]));
  const selected = new Set(plan.changes.map(change => change.id));
  for (const profile of await Empleado.find().lean()) {
    const original = byId.get(String(profile._id));
    for (const field of ["name", "document", "user", "hireDate", "status"])
      expect(profile[field]).toEqual(original[field]);
    if (!selected.has(String(profile._id))) expect(profile).toEqual(original);
  }
  expect(await User.find().select("+password").lean()).toEqual(accounts);
  expect(await mongoose.connection.transaction(session => applyGuardPlan(plan, session))).toMatchObject({ changes: 0, alreadyApplied: true });
});

test("rechaza un plan desactualizado sin cambiar cargos", async () => {
  const plan = buildGuardPlan(await fixture());
  await Empleado.updateOne({ _id: plan.changes[0].id }, { $set: { name: "Edición concurrente" } });
  await expect(mongoose.connection.transaction(session => applyGuardPlan(plan, session))).rejects.toThrow("Los perfiles cambiaron");
  expect(await Empleado.countDocuments({ position: "Guarda de seguridad" })).toBe(127);
  expect(await Empleado.countDocuments({ position: "Guarda canino" })).toBe(0);
});

test("un error posterior a las escrituras revierte todos los cambios de cargos", async () => {
  const plan = buildGuardPlan(await fixture());
  const original = Empleado.bulkWrite.bind(Empleado);
  const failure = vi.spyOn(Empleado, "bulkWrite").mockImplementationOnce(async (...args) => {
    await original(...args);
    throw new Error("Fallo sintético posterior a escritura");
  });
  try {
    await expect(mongoose.connection.transaction(session => applyGuardPlan(plan, session))).rejects.toThrow("Fallo sintético");
    expect(stateHash(await Empleado.find().lean())).toBe(plan.beforeHash);
  } finally { failure.mockRestore(); }
});
