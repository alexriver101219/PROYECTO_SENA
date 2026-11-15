/* global vi */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const { PassThrough } = require("node:stream");
const User = require("../models/User");
const Empleado = require("../models/Empleado");
const { createApp } = require("../app");
const { seed } = require("../scripts/seed");
const { main, parseArgs, collectPasswords, safeFailureMessage } = require("../scripts/rotate-passwords");
const { readHidden, validateNewPassword } = require("../scripts/lib/password-input");
const {
  EMAILS, COLLECTION, createMaintenanceClient, assertExpectedTarget, inspectAccounts, rotatePasswords,
} = require("../scripts/lib/password-rotation");

// Solo fixtures de pruebas; nunca se usan en Atlas o en cuentas reales.
const previous = "test-only-previous-credential";
const replacements = ["test-only-new-admin-credential", "test-only-new-employee-credential"];
let client, target;

beforeEach(async () => {
  client = mongoose.connection.getClient();
  target = createMaintenanceClient(process.env.MONGO_URI).target;
  await User.create([
    { name: "Admin Prueba", email: EMAILS[0], role: "admin", password: await bcrypt.hash(previous, 4) },
    { name: "Empleado Prueba", email: EMAILS[1], role: "employee", password: await bcrypt.hash(previous, 4) },
    { name: "Otra Cuenta", email: "otra@sesha.com", role: "employee", password: await bcrypt.hash(previous, 4) },
  ]);
});

const rotate = (overrides = {}) => rotatePasswords({
  client, target, expected: target, approved: true, passwords: [...replacements], ...overrides,
});
const snapshot = () => User.collection.find({}).sort({ email: 1 }).toArray();

test("inspección por defecto no escribe ni muestra URI, claves o hashes", async () => {
  const before = await snapshot();
  const indexes = await User.collection.indexes();
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  try {
    await main([]);
    const output = log.mock.calls.flat().join(" ");
    expect(output.includes(process.env.MONGO_URI)).toBe(false);
    expect(output.includes(previous)).toBe(false);
    expect(output.includes("$2")).toBe(false);
    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({ ...target, verified: true, mode: "read-only" });
    expect(await snapshot()).toEqual(before);
    expect(await User.collection.indexes()).toEqual(indexes);
  } finally { log.mockRestore(); }
});

test("rotación atómica con bcrypt 12, invalida JWT y preserva roles y todos los demás campos", async () => {
  const before = await snapshot();
  const tokens = before.filter((account) => EMAILS.includes(account.email)).map((account) => jwt.sign(
    { version: account.sessionVersion }, process.env.JWT_SECRET,
    { subject: String(account._id), issuer: "sesha-api", audience: "sesha-web" },
  ));
  const app = createApp({ limits: false });
  for (const token of tokens)
    expect((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`)).status).toBe(200);
  const profilesBefore = await Empleado.collection.find({}).toArray();
  await rotate();
  const after = await snapshot();
  for (let i = 0; i < before.length; i++) {
    if (!EMAILS.includes(before[i].email)) { expect(after[i]).toEqual(before[i]); continue; }
    const index = EMAILS.indexOf(before[i].email);
    expect(bcrypt.getRounds(after[i].password)).toBe(12);
    expect(await bcrypt.compare(replacements[index], after[i].password)).toBe(true);
    expect(await bcrypt.compare(previous, after[i].password)).toBe(false);
    expect(after[i].sessionVersion).toBe(before[i].sessionVersion + 1);
    const { password: _oldHash, sessionVersion: _oldVersion, ...oldFields } = before[i];
    const { password: _newHash, sessionVersion: _newVersion, ...newFields } = after[i];
    expect(newFields).toEqual(oldFields);
    expect((await request(app).post("/api/auth/login").send({ email: before[i].email, password: previous })).status).toBe(401);
    expect((await request(app).post("/api/auth/login").send({ email: before[i].email, password: replacements[index] })).status).toBe(200);
  }
  for (const token of tokens)
    expect((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`)).status).toBe(401);
  expect(await Empleado.collection.find({}).toArray()).toEqual(profilesBefore);
});

test("sin autorización o con destino distinto no actualiza cuentas", async () => {
  const before = await snapshot();
  await expect(rotate({ approved: false })).rejects.toThrow("autorización");
  await expect(rotate({ expected: { ...target, database: "otra_base" } })).rejects.toThrow("destino");
  await expect(rotate({ expected: { ...target, host: "otro_host" } })).rejects.toThrow("destino");
  expect(await snapshot()).toEqual(before);
});

test("cuenta ausente no crea cuentas ni cambia la primera", async () => {
  await User.deleteOne({ email: EMAILS[1] });
  const before = await snapshot();
  await expect(inspectAccounts(client.db(target.database))).rejects.toThrow("exactamente");
  await expect(rotate()).rejects.toThrow("ausentes");
  expect(await snapshot()).toEqual(before);
});

test("si falla la segunda actualización revierte la primera", async () => {
  await User.collection.updateOne({ email: EMAILS[1] }, { $set: { sessionVersion: "invalid-test-version" } });
  const before = await snapshot();
  await expect(rotate()).rejects.toThrow();
  expect(await snapshot()).toEqual(before);
});

test("las cuentas duplicadas detienen inspección y rotación sin escrituras", async () => {
  await User.collection.dropIndex("email_1");
  const duplicate = await User.collection.insertOne({
    email: EMAILS[1], password: await bcrypt.hash(previous, 4), role: "employee",
  });
  try {
    const before = await snapshot();
    await expect(inspectAccounts(client.db(target.database))).rejects.toThrow("exactamente");
    await expect(rotate()).rejects.toThrow("duplicadas");
    expect(await snapshot()).toEqual(before);
  } finally {
    await User.collection.deleteOne({ _id: duplicate.insertedId });
    await User.createIndexes();
  }
});

test("rechaza claves inválidas, iguales entre sí o iguales a la anterior sin cambios", async () => {
  const before = await snapshot();
  for (const passwords of [["short", replacements[1]], ["é".repeat(37), replacements[1]],
    [replacements[0], replacements[0]], [previous, replacements[1]]])
    await expect(rotate({ passwords })).rejects.toThrow();
  expect(await snapshot()).toEqual(before);
  expect(() => validateNewPassword("é".repeat(36))).not.toThrow();
});

test("destino explícito, TLS Atlas y argumentos sin secretos", () => {
  expect(() => createMaintenanceClient("mongodb://127.0.0.1:27017/")).toThrow("explícita");
  expect(() => createMaintenanceClient("mongodb+srv://cluster.example.invalid/db?tls=false")).toThrow("TLS");
  expect(() => createMaintenanceClient("mongodb://127.0.0.1/db?tlsAllowInvalidCertificates=true")).toThrow("TLS");
  expect(() => createMaintenanceClient("mongodb://127.0.0.1/db?tlsAllowInvalidHostnames=true")).toThrow("TLS");
  expect(() => createMaintenanceClient("mongodb://127.0.0.1/db?tlsInsecure=true")).toThrow("TLS");
  expect(() => createMaintenanceClient("mongodb://remote.example.invalid/db")).toThrow("TLS");
  expect(() => createMaintenanceClient("invalid-private-uri")).toThrow();
  expect(() => assertExpectedTarget(target)).toThrow();
  expect(() => parseArgs(["--password", "test-only-value"])).toThrow();
  expect(parseArgs(["--apply", "--expected-host", "host", "--expected-db", "db"]))
    .toEqual({ apply: true, host: "host", database: "db" });
});

function terminal() {
  const input = new PassThrough();
  input.isTTY = true;
  input.setRawMode = (value) => { input.isRaw = value; };
  let outputText = "";
  const output = { isTTY: true, write: (value) => { outputText += value; } };
  return { input, output, text: () => outputText };
}

test("entrada oculta: no eco, borrado, UTF-8 dividido y restauración del terminal", async () => {
  const io = terminal();
  const pending = readHidden("Clave: ", io);
  inputText(io, "test-only-fixtureX\b");
  const bytes = Buffer.from("é");
  io.input.emit("data", bytes.subarray(0, 1));
  io.input.emit("data", bytes.subarray(1));
  inputText(io, "\r");
  expect(await pending).toBe("test-only-fixtureé");
  expect(io.text()).toBe("Clave: \n");
  expect(io.input.isRaw).toBe(false);
  expect(io.input.listenerCount("data")).toBe(0);
});
function inputText(io, text) { io.input.emit("data", Buffer.from(text)); }

test("Ctrl+C y pegados multilínea cancelan sin eco; tuberías se rechazan", async () => {
  for (const text of ["\u0003", "test-only-one\rtest-only-two\r"]) {
    const io = terminal();
    const pending = readHidden("Clave: ", io);
    inputText(io, text);
    await expect(pending).rejects.toThrow("cancelada");
    expect(io.text()).toBe("Clave: \n");
    expect(io.input.isRaw).toBe(false);
  }
  await expect(readHidden("Clave: ", { input: { isTTY: false }, output: { isTTY: true } }))
    .rejects.toThrow("terminal");
});

test("la semilla exige sus variables privadas antes de conectar o escribir", async () => {
  const saved = process.env.SEED_ADMIN_PASSWORD;
  const before = await snapshot();
  delete process.env.SEED_ADMIN_PASSWORD;
  try { await expect(seed()).rejects.toThrow("SEED_ADMIN_PASSWORD"); }
  finally { process.env.SEED_ADMIN_PASSWORD = saved; }
  expect(await snapshot()).toEqual(before);
  expect(COLLECTION).toBe(User.collection.collectionName);
});

test("una clave inválida o una confirmación distinta permite corregir sin revelar entradas ni escribir", async () => {
  const before = await snapshot();
  const answers = ["short", replacements[0], "test-only-wrong-confirmation", replacements[0], replacements[0], replacements[1], replacements[1]];
  const messages = [];
  const read = async (prompt) => { messages.push(prompt); return answers.shift(); };
  const result = await collectPasswords({ read, write: (message) => messages.push(message) });
  expect(result).toEqual(replacements);
  expect(messages.some((message) => message.includes("12 caracteres"))).toBe(true);
  expect(messages.some((message) => message.includes("confirmación no coincide"))).toBe(true);
  const output = messages.join("\n");
  for (const value of ["short", ...replacements, "test-only-wrong-confirmation"])
    expect(output.includes(value)).toBe(false);
  expect(await snapshot()).toEqual(before);
});

test("una clave repetida entre cuentas vuelve a pedir solo la segunda", async () => {
  const answers = [replacements[0], replacements[0], replacements[0], replacements[1], replacements[1]];
  const messages = [];
  const result = await collectPasswords({ read: async () => answers.shift(), write: (message) => messages.push(message) });
  expect(result).toEqual(replacements);
  expect(messages.some((message) => message.includes("clave distinta para cada cuenta"))).toBe(true);
  for (const value of replacements) expect(messages.join(" ").includes(value)).toBe(false);
});

test("cancelar la entrada detiene la captura sin reintentos ni escrituras", async () => {
  const before = await snapshot();
  let calls = 0;
  const read = async () => {
    calls++;
    throw Object.assign(new Error("test-only-private-details"), { code: "PRIVATE_INPUT_CANCELLED" });
  };
  await expect(collectPasswords({ read, write: () => {} })).rejects.toMatchObject({ code: "PRIVATE_INPUT_CANCELLED" });
  expect(calls).toBe(1);
  expect(await snapshot()).toEqual(before);
});

test("los mensajes de error públicos usan textos fijos y omiten detalles privados del driver", () => {
  const privateDetails = "test-only-private-driver-details";
  for (const code of [undefined, "UNKNOWN", "PRIVATE_INPUT_CANCELLED", "PRIVATE_TTY_REQUIRED", "PASSWORD_POLICY", "AUTHORIZATION_MISMATCH", "toString"])
    expect(safeFailureMessage({ code, message: privateDetails }).includes(privateDetails)).toBe(false);
  expect(safeFailureMessage({ code: "PASSWORD_POLICY" })).toContain("12 caracteres");
  expect(safeFailureMessage({ code: "PRIVATE_INPUT_CANCELLED" })).toContain("cancelada");
});
