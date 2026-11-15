/* global vi */
const request = require("supertest");
const bcrypt = require("bcryptjs");
const { createApp } = require("../app");
const User = require("../models/User");
const Empleado = require("../models/Empleado");
const service = require("../services/auth");
const app = createApp({ limits: false });
const current = "test-only-web-current-credential";
const replacement = "test-only-web-replacement-credential";
const emails = ["admin@sesha.com", "carlos.mendoza@sesha.com", "otra@sesha.com"];
const body = (email = emails[0], overrides = {}) => ({
  email, currentPassword: current, newPassword: replacement, confirmPassword: replacement, ...overrides,
});
const snapshot = () => User.collection.find({}).sort({ email: 1 }).toArray();

beforeEach(async () => {
  const hash = await bcrypt.hash(current, 4);
  for (const [index, email] of emails.entries()) {
    const user = await User.create({ name: `Cuenta prueba ${index}`, email, role: index === 0 ? "admin" : "employee", password: hash });
    await Empleado.create({ user: user._id, name: user.name, document: String(3000000000 + index),
      position: "Guarda de seguridad", department: "Operaciones", status: "Activo", hireDate: "2020-01-01" });
  }
});

test.each(emails.slice(0, 2))("cambio web de %s conserva datos, bcrypt 12 y revoca todas sus sesiones", async (email) => {
  const before = await snapshot();
  const profiles = await Empleado.collection.find({}).toArray();
  const oldSession = await service.login(email, current);
  const response = await request(app).post("/api/auth/change-password").send(body(email));
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ success: true, message: "Contraseña actualizada. Inicia sesión con tu nueva contraseña." });
  expect(response.headers["set-cookie"][0]).toMatch(/sesha_session=;/);
  const after = await snapshot();
  for (const [index, original] of before.entries()) {
    if (original.email !== email) { expect(after[index]).toEqual(original); continue; }
    expect(await bcrypt.compare(replacement, after[index].password)).toBe(true);
    expect(await bcrypt.compare(current, after[index].password)).toBe(false);
    expect(bcrypt.getRounds(after[index].password)).toBe(12);
    expect(after[index]).toEqual({ ...original, password: after[index].password, sessionVersion: original.sessionVersion + 1 });
  }
  expect(await Empleado.collection.find({}).toArray()).toEqual(profiles);
  expect((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${oldSession.token}`)).status).toBe(401);
  expect((await request(app).post("/api/auth/login").send({ email, password: current })).status).toBe(401);
  expect((await request(app).post("/api/auth/login").send({ email, password: replacement })).status).toBe(200);
  for (const value of [current, replacement, "$2", oldSession.token])
    expect(JSON.stringify(response.body).includes(value)).toBe(false);
});

test("correo inexistente, contraseña incorrecta y cuenta inactiva responden igual y no escriben", async () => {
  await User.updateOne({ email: emails[1] }, { $set: { active: false } });
  const before = await snapshot();
  const responses = [];
  for (const payload of [body("inexistente@sesha.com"), body(emails[0], { currentPassword: "test-only-wrong-current" }), body(emails[1])]) {
    const response = await request(app).post("/api/auth/change-password").send(payload);
    expect(response.status).toBe(401);
    responses.push(response.body);
    expect(response.headers["set-cookie"]).toBeUndefined();
  }
  expect(responses[0]).toEqual(responses[1]);
  expect(responses[1]).toEqual(responses[2]);
  expect(await snapshot()).toEqual(before);
});

test("rechaza confirmación distinta, reutilización, límites bcrypt, controles e inyección sin cambios", async () => {
  const before = await snapshot();
  for (const overrides of [
    { confirmPassword: "test-only-other-confirmation" },
    { newPassword: current, confirmPassword: current },
    { newPassword: "short", confirmPassword: "short" },
    { newPassword: "é".repeat(37), confirmPassword: "é".repeat(37) },
    { newPassword: "test-only-with\nnewline", confirmPassword: "test-only-with\nnewline" },
    { role: "admin" }, { email: { $ne: null } }, { currentPassword: { $ne: null } },
  ]) expect((await request(app).post("/api/auth/change-password").send(body(emails[0], overrides))).status).toBe(400);
  expect(await snapshot()).toEqual(before);
});

test("cookie y JWT ajenos no sustituyen la contraseña actual; CORS bloquea otro origen", async () => {
  const session = await service.login(emails[0], current);
  const before = await snapshot();
  const response = await request(app).post("/api/auth/change-password")
    .set("Cookie", `sesha_session=${session.token}`)
    .set("Authorization", `Bearer ${session.token}`)
    .send(body(emails[1], { currentPassword: "test-only-incorrect-credential" }));
  expect(response.status).toBe(401);
  expect((await request(app).post("/api/auth/change-password").set("Origin", "https://example.invalid").send(body())).status).toBe(403);
  expect(await snapshot()).toEqual(before);
});

test("la ruta comparte el límite de intentos de autenticación", async () => {
  const limited = createApp({ limits: true });
  const before = await snapshot();
  // Una secuencia que cruza un cuarto de hora corresponde a dos ventanas.
  // Fijar Date.now conserva una sola ventana y deja su TTL en el futuro real.
  const clock = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 15 * 60000);
  try {
    for (let i = 0; i < 20; i++)
      expect((await request(limited).post("/api/auth/change-password").send({})).status).toBe(400);
    const response = await request(limited).post("/api/auth/change-password").send(body());
    expect(response.status).toBe(429);
    expect(await snapshot()).toEqual(before);
  } finally { clock.mockRestore(); }
});

test("un cambio concurrente evita sobrescribir la cuenta", async () => {
  const before = await snapshot();
  const update = vi.spyOn(User, "updateOne").mockResolvedValueOnce({ modifiedCount: 0 });
  try {
    expect((await request(app).post("/api/auth/change-password").send(body())).status).toBe(409);
    expect(await snapshot()).toEqual(before);
  } finally { update.mockRestore(); }
});
