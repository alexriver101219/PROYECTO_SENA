const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { MongoClient } = mongoose.mongo;
const { vi } = globalThis;
const User = require("../models/User");
const { quarantineAdditionalAccounts } = require("../scripts/lib/additional-quarantine");
const target = { host: "127.0.0.1", database: "sesha_test", collection: "empleados" };
const published = "test-only-published-reference";
let client, manifest;
const snapshot = () => User.collection.find({}).sort({ _id: 1 }).toArray();
const options = () => ({ client, target, expected: target, manifest, publishedPasswords: [published], apply: true, approved: true });
beforeEach(async () => {
  client = new MongoClient(process.env.MONGO_URI); await client.connect();
  const password = await bcrypt.hash(published, 4);
  const users = await User.insertMany(Array.from({ length: 19 }, (_, i) => ({ name: "Empleado prueba", email: `extra.${i}@sesha.com`, password, role: "employee" })));
  await User.create({ name: "Admin", email: "admin@sesha.com", role: "admin", password });
  manifest = { target, accounts: users.map((user) => ({ id: String(user._id), email: user.email, role: user.role })) };
});
afterEach(async () => { await client?.close(); });
test("vista previa conserva todo; solo las 19 autorizadas se desactivan y una repetición es inocua", async () => {
  const before = await snapshot();
  expect((await quarantineAdditionalAccounts({ ...options(), apply: false, approved: false })).activeRemaining).toBe(19);
  expect(await snapshot()).toEqual(before);
  expect((await quarantineAdditionalAccounts(options())).disabled).toBe(19);
  const ids = new Set(manifest.accounts.map((user) => user.id));
  const after = await snapshot();
  expect(after).toEqual(before.map((user) => ids.has(String(user._id)) ? { ...user, active: false, sessionVersion: 1 } : user));
  expect((await quarantineAdditionalAccounts(options())).disabled).toBe(0);
  expect(await snapshot()).toEqual(after);
});
test("sin aprobación, con destino erróneo o cuenta protegida no escribe", async () => {
  const before = await snapshot();
  await expect(quarantineAdditionalAccounts({ ...options(), approved: false })).rejects.toThrow();
  await expect(quarantineAdditionalAccounts({ ...options(), expected: { ...target, database: "wrong" } })).rejects.toThrow();
  manifest.accounts[0].email = "admin@sesha.com";
  await expect(quarantineAdditionalAccounts(options())).rejects.toThrow();
  expect(await snapshot()).toEqual(before);
});
test("una contraseña ya corregida o un manifiesto incompleto cancela sin desactivar a nadie", async () => {
  const before = await snapshot();
  await expect(quarantineAdditionalAccounts({ ...options(), publishedPasswords: ["test-only-other-reference"] })).rejects.toThrow();
  manifest.accounts.pop();
  await expect(quarantineAdditionalAccounts(options())).rejects.toThrow();
  expect(await snapshot()).toEqual(before);
});
test("una segunda escritura fallida revierte también la primera", async () => {
  const before = await snapshot();
  const prototype = Object.getPrototypeOf(client.db(target.database).collection("empleados"));
  const original = prototype.updateOne;
  let writes = 0;
  const spy = vi.spyOn(prototype, "updateOne").mockImplementation(function (...args) {
    if (++writes === 2) throw new Error("test-only-write-failure");
    return original.apply(this, args);
  });
  try {
    await expect(quarantineAdditionalAccounts(options())).rejects.toThrow();
    expect(await snapshot()).toEqual(before);
  } finally { spy.mockRestore(); }
});
