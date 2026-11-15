const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { vi } = globalThis;
const User = require("../models/User");
const Empleado = require("../models/Empleado");
const { completionPlan, variedDocuments, projectedDataset, completeEmployeeDataset } = require("../scripts/lib/complete-employee-dataset");
const target = { host: "127.0.0.1", database: "sesha_test" };
const hash = bcrypt.hashSync("test-only-completion-credential", 12);
let client, compare;
const snapshot = async () => ({
  beforeUsers: await User.collection.find({}).sort({ _id: 1 }).toArray(),
  beforeProfiles: await Empleado.collection.find({}).sort({ _id: 1 }).toArray(),
});
const preservedEmails = Array.from({ length: 120 }, (_, i) => `persona.${String(i + 1).padStart(3, "0")}@sesha.com`);
async function options() {
  const before = await snapshot();
  const plan = completionPlan(before.beforeUsers, before.beforeProfiles, preservedEmails);
  return { client, target, expected: target, approved: true, ...before, preservedEmails,
    credentials: plan.accounts.map((item, index) => ({ userId: item.user._id, email: item.email,
      password: `test-only-completion-credential-${index}`, hash })),
    documents: variedDocuments(before.beforeProfiles) };
}
beforeEach(async () => {
  client = new mongoose.mongo.MongoClient(process.env.MONGO_URI);
  await client.connect();
  const users = await User.insertMany(Array.from({ length: 152 }, (_, index) => ({
    name: index === 151 ? "Administrador" : `Persona Álvarez ${index}`,
    email: index < 120 ? preservedEmails[index] : index === 151 ? "admin@sesha.com" : `historico${index}@test.com`,
    role: index === 151 ? "admin" : "employee", password: hash, active: index < 120 || index === 151, sessionVersion: 4,
  })));
  await Empleado.insertMany(users.map((user, index) => ({ user: user._id, name: user.name,
    document: String(9900000000 + index), position: "Analista", department: "Operaciones", hireDate: "2020-01-01",
    status: user.active ? "Activo" : "Inactivo" })));
  // La validación criptográfica se prueba por separado; aquí se aíslan las garantías de la transacción.
  compare = vi.spyOn(bcrypt, "compare").mockResolvedValue(true);
});
afterEach(async () => { compare?.mockRestore(); await client?.close(); });

test("continúa 121–151, activa las restantes y cambia todos los documentos conservando acceso admin y 120 cuentas", async () => {
  await User.collection.updateOne({ email: "historico120@test.com" }, { $unset: { sessionVersion: "" } });
  const input = await options();
  const projected = projectedDataset(input);
  const result = await completeEmployeeDataset(input);
  expect(result).toMatchObject({ accountsUpdated: 31, documentsUpdated: 152, preservedAccesses: 120 });
  const after = await snapshot();
  expect(after.beforeUsers).toEqual(projected.users);
  expect(after.beforeProfiles).toEqual(projected.profiles);
  const preserved = new Set([...preservedEmails, "admin@sesha.com"]);
  expect(after.beforeUsers.filter((user) => preserved.has(user.email)))
    .toEqual(input.beforeUsers.filter((user) => preserved.has(user.email)));
  expect(after.beforeUsers.every((user) => user.active)).toBe(true);
  expect(after.beforeUsers.find((user) => String(user._id) === String(input.credentials[0].userId)).sessionVersion).toBe(1);
  expect(projected.plan.accounts.map((item) => item.sequence)).toEqual(Array.from({ length: 31 }, (_, i) => i + 121));
  expect(new Set(after.beforeProfiles.map((p) => p.document)).size).toBe(152);
  for (const profile of after.beforeProfiles) {
    const old = input.beforeProfiles.find((p) => String(p._id) === String(profile._id));
    expect(profile).toEqual({ ...old, document: profile.document, status: "Activo" });
    expect(profile.document).not.toBe(old.document);
    expect(profile.document).not.toMatch(/^(97|99|100000)/u);
  }
});

test("un fallo tras modificar cuentas revierte también los documentos", async () => {
  const input = await options();
  const prototype = Object.getPrototypeOf(client.db(target.database).collection("empleados"));
  const original = prototype.updateOne;
  let writes = 0;
  const spy = vi.spyOn(prototype, "updateOne").mockImplementation(function (...args) {
    if (++writes === 36) throw new Error("test-only-profile-write-failure");
    return original.apply(this, args);
  });
  try {
    await expect(completeEmployeeDataset(input)).rejects.toThrow("test-only-profile-write-failure");
    expect(await snapshot()).toEqual({ beforeUsers: input.beforeUsers, beforeProfiles: input.beforeProfiles });
  } finally { spy.mockRestore(); }
});

test("rechaza duplicados, acceso admin en el plan, claves inconsistentes y falta de autorización", async () => {
  const input = await options();
  await expect(completeEmployeeDataset({ ...input, approved: false })).rejects.toThrow();
  await expect(completeEmployeeDataset({ ...input, expected: { ...target, database: "other" } })).rejects.toThrow();
  const documents = input.documents.map((item, index) => index === 1 ? { ...item, document: input.documents[0].document } : item);
  await expect(completeEmployeeDataset({ ...input, documents })).rejects.toThrow();
  const credentials = input.credentials.map((item, index) => index === 0 ? { ...item, email: "admin@sesha.com" } : item);
  await expect(completeEmployeeDataset({ ...input, credentials })).rejects.toThrow();
  compare.mockResolvedValueOnce(false);
  await expect(completeEmployeeDataset(input)).rejects.toThrow("La clave no corresponde");
  expect(await snapshot()).toEqual({ beforeUsers: input.beforeUsers, beforeProfiles: input.beforeProfiles });
});

test("no sobrescribe cambios concurrentes y exige un vínculo único por cuenta", async () => {
  const input = await options();
  expect(() => completionPlan(input.beforeUsers, input.beforeProfiles.slice(1), preservedEmails)).toThrow();
  await User.updateOne({ email: "admin@sesha.com" }, { $set: { name: "Admin actualizado" } });
  const concurrent = await snapshot();
  await expect(completeEmployeeDataset(input)).rejects.toThrow("Datos concurrentes");
  expect(await snapshot()).toEqual(concurrent);
});
