const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { vi } = globalThis;
const User = require("../models/User");
const Empleado = require("../models/Empleado");
const { DEMO_EMAILS } = require("../scripts/lib/demo-quarantine");
const { accountPlan, activateEmployeeAccounts } = require("../scripts/lib/activate-employee-accounts");
const target = { host: "127.0.0.1", database: "sesha_test" };
let client, compare;
const snapshots = async () => ({
  beforeUsers: await User.collection.find({}).sort({ _id: 1 }).toArray(),
  beforeProfiles: await Empleado.collection.find({}).sort({ _id: 1 }).toArray(),
});
// Estas pruebas aíslan la transacción; el ejecutor real verifica cada hash bcrypt.
const hash = bcrypt.hashSync("test-only-initial-password", 12);
const credentials = (plan) => plan.map((item, index) => ({
  email: item.email, password: `test-only-initial-password-${index}`, hash,
}));
const options = async () => {
  const before = await snapshots();
  return { client, target, expected: target, approved: true, ...before,
    credentials: credentials(accountPlan(before.beforeUsers, before.beforeProfiles)) };
};
beforeEach(async () => {
  client = new mongoose.mongo.MongoClient(process.env.MONGO_URI);
  await client.connect();
  for (const [index, email] of DEMO_EMAILS.entries()) {
    const name = `Ana García ${index} (Demo ${String(index + 1).padStart(3, "0")})`;
    const user = await User.create({ name, email, password: hash, role: "employee", active: false, sessionVersion: 2 });
    await Empleado.create({ user: user._id, name, document: String(9900000001 + index),
      position: "Guarda de seguridad", department: "Operaciones", status: "Activo", hireDate: "2020-01-01" });
  }
  await User.create({ name: "Admin", email: "admin@sesha.com", password: hash, role: "admin" });
  compare = vi.spyOn(bcrypt, "compare").mockResolvedValue(true);
});
afterEach(async () => { compare?.mockRestore(); await client?.close(); });

test("reactiva exactamente 120, elimina etiquetas de nombres y correos y conserva IDs, cargos y otras cuentas", async () => {
  const input = await options();
  const result = await activateEmployeeAccounts(input);
  expect(result.activated).toBe(120);
  const after = await snapshots();
  expect(after.beforeUsers).toHaveLength(121);
  expect(after.beforeProfiles).toHaveLength(120);
  expect(after.beforeUsers.find((user) => user.role === "admin")).toEqual(input.beforeUsers.find((user) => user.role === "admin"));
  for (const original of input.beforeUsers.filter((user) => user.role === "employee")) {
    const updated = after.beforeUsers.find((user) => String(user._id) === String(original._id));
    expect(updated.active).toBe(true);
    expect(updated.sessionVersion).toBe(3);
    expect(updated.name + updated.email).not.toMatch(/demo/iu);
    const oldProfile = input.beforeProfiles.find((profile) => String(profile.user) === String(original._id));
    const newProfile = after.beforeProfiles.find((profile) => String(profile.user) === String(original._id));
    expect(newProfile).toEqual({ ...oldProfile, name: updated.name, status: "Activo" });
  }
  await expect(activateEmployeeAccounts(input)).rejects.toThrow();
  expect(await snapshots()).toEqual(after);
});

test("un fallo a mitad de las escrituras revierte cuentas y perfiles juntos", async () => {
  const input = await options();
  const prototype = Object.getPrototypeOf(client.db(target.database).collection("empleados"));
  const original = prototype.updateOne;
  let writes = 0;
  const spy = vi.spyOn(prototype, "updateOne").mockImplementation(function (...args) {
    if (++writes === 5) throw new Error("test-only-write-failure");
    return original.apply(this, args);
  });
  try {
    await expect(activateEmployeeAccounts(input)).rejects.toThrow("test-only-write-failure");
    expect(await snapshots()).toEqual({ beforeUsers: input.beforeUsers, beforeProfiles: input.beforeProfiles });
  } finally { spy.mockRestore(); }
});

test("cancela ante falta de autorización, destino distinto, contraseña inconsistente o datos concurrentes", async () => {
  const input = await options();
  await expect(activateEmployeeAccounts({ ...input, approved: false })).rejects.toThrow();
  await expect(activateEmployeeAccounts({ ...input, expected: { ...target, database: "other" } })).rejects.toThrow();
  compare.mockResolvedValueOnce(false);
  await expect(activateEmployeeAccounts(input)).rejects.toThrow("Credenciales inconsistentes");
  expect(await snapshots()).toEqual({ beforeUsers: input.beforeUsers, beforeProfiles: input.beforeProfiles });
  await User.updateOne({ email: "admin@sesha.com" }, { $set: { name: "Admin actualizado" } });
  const concurrent = await snapshots();
  await expect(activateEmployeeAccounts(input)).rejects.toThrow("La base cambió");
  expect(await snapshots()).toEqual(concurrent);
});

test("rechaza perfiles sin vínculo, cuentas privilegiadas y colisiones de correo", async () => {
  const input = await options();
  const first = input.beforeUsers.find((user) => user.email === DEMO_EMAILS[0]);
  for (const users of [
    input.beforeUsers.filter((user) => user !== first),
    input.beforeUsers.map((user) => user === first ? { ...user, role: "admin" } : user),
    [...input.beforeUsers, { email: input.credentials[0].email }],
  ]) expect(() => accountPlan(users, input.beforeProfiles)).toThrow();
  expect(() => accountPlan(input.beforeUsers, [])).toThrow();
  expect(await snapshots()).toEqual({ beforeUsers: input.beforeUsers, beforeProfiles: input.beforeProfiles });
});
