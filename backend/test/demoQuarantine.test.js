const mongoose = require("mongoose");
const { vi } = globalThis;
const { MongoClient } = mongoose.mongo;
const { DEMO_EMAILS, quarantineDemoAccounts } = require("../scripts/lib/demo-quarantine");
const User = require("../models/User");
const Empleado = require("../models/Empleado");
let client;
const target = { host: "127.0.0.1", database: "sesha_test", collection: "empleados" };
const options = () => ({ client, target, expected: target, apply: true, approved: true });
const snapshot = () => User.collection.find({}).sort({ _id: 1 }).toArray();
beforeEach(async () => {
  client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  await User.insertMany(DEMO_EMAILS.map((email) => ({ name: "Demo", email, role: "employee", password: "test-only-unused-hash", sessionVersion: 2 })));
  const admin = await User.create({ name: "Admin", email: "admin@sesha.com", role: "admin", password: "test-only-unused-hash" });
  await Empleado.create({ user: admin._id, name: "Admin", document: "1012345678", position: "Administrador", department: "Administración" });
});
afterEach(async () => { await client?.close(); });
test("vista previa no escribe; cuarentena preserva cuentas, claves, roles, perfiles y es idempotente", async () => {
  const before = await snapshot();
  const profiles = await Empleado.collection.find({}).toArray();
  expect((await quarantineDemoAccounts({ ...options(), apply: false, approved: false })).activeRemaining).toBe(120);
  expect(await snapshot()).toEqual(before);
  expect((await quarantineDemoAccounts(options())).disabled).toBe(120);
  const after = await snapshot();
  expect(after).toEqual(before.map((user) => DEMO_EMAILS.includes(user.email)
    ? { ...user, active: false, sessionVersion: 3 } : user));
  expect(await Empleado.collection.find({}).toArray()).toEqual(profiles);
  expect((await quarantineDemoAccounts(options())).disabled).toBe(0);
  expect(await snapshot()).toEqual(after);
});
test("requiere autorización y destino exactos, sin escrituras", async () => {
  const before = await snapshot();
  await expect(quarantineDemoAccounts({ ...options(), approved: false })).rejects.toThrow();
  await expect(quarantineDemoAccounts({ ...options(), expected: { ...target, database: "other" } })).rejects.toThrow();
  expect(await snapshot()).toEqual(before);
});
test("un fallo después de la primera escritura revierte toda la cuarentena", async () => {
  const before = await snapshot();
  const prototype = Object.getPrototypeOf(client.db(target.database).collection("empleados"));
  const original = prototype.updateOne;
  let writes = 0;
  const spy = vi.spyOn(prototype, "updateOne").mockImplementation(function (...args) {
    if (++writes === 2) throw new Error("test-only-write-failure");
    return original.apply(this, args);
  });
  try {
    await expect(quarantineDemoAccounts(options())).rejects.toThrow();
    expect(await snapshot()).toEqual(before);
  } finally { spy.mockRestore(); }
});
test.each(["missing", "duplicate", "role"])("un alcance %s cancela toda la operación", async (kind) => {
  if (kind === "missing") await User.deleteOne({ email: DEMO_EMAILS[0] });
  if (kind === "role") await User.updateOne({ email: DEMO_EMAILS[0] }, { $set: { role: "admin" } });
  if (kind === "duplicate") {
    await User.collection.dropIndex("email_1");
    await User.collection.insertOne({ name: "Duplicado", email: DEMO_EMAILS[0], role: "employee", active: true });
  }
  const before = await snapshot();
  try {
    await expect(quarantineDemoAccounts(options())).rejects.toThrow();
    expect(await snapshot()).toEqual(before);
  } finally {
    if (kind === "duplicate") {
      await User.collection.deleteOne({ name: "Duplicado" });
      await User.createIndexes();
    }
  }
});
