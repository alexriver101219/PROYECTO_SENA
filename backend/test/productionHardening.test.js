const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createApp } = require("../app");
const User = require("../models/User");
const Empleado = require("../models/Empleado");
const { register } = require("../services/auth");
const { validateConfig } = require("../config/env");
const app = createApp({ limits: false });
const initialPassword = "test-only-admin-created-credential";
const data = { name: "Empleado Verificado", email: "nuevo@sesha.com", document: "1001234567",
  position: "Guarda de seguridad", department: "Operaciones", status: "Activo", hireDate: "2024-01-02", initialPassword };
async function authorization(role = "admin") {
  const user = await User.create({ name: "Responsable", email: `${role}@sesha.com`, role, password: "test-only-unused-hash" });
  return "Bearer " + jwt.sign({ version: 0 }, process.env.JWT_SECRET,
    { subject: String(user._id), issuer: "sesha-api", audience: "sesha-web", expiresIn: "1h" });
}
test("producción cierra el registro público en ruta y servicio sin crear perfiles ficticios", async () => {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    expect((await request(app).get("/api/auth/registration")).body).toEqual({ enabled: false });
    expect((await request(app).post("/api/auth/register").send({ name: data.name, email: data.email, password: initialPassword })).status).toBe(403);
    await expect(register({ name: data.name, email: data.email, password: initialPassword })).rejects.toThrow();
    expect(await User.countDocuments()).toBe(0);
    expect(await Empleado.countDocuments()).toBe(0);
  } finally { process.env.NODE_ENV = original; }
});
test("desarrollo también cierra el registro salvo habilitación explícita para datos desechables", async () => {
  const originalMode = process.env.NODE_ENV;
  const originalFlag = process.env.ALLOW_SELF_REGISTRATION;
  process.env.NODE_ENV = "development";
  delete process.env.ALLOW_SELF_REGISTRATION;
  try {
    expect((await request(app).get("/api/auth/registration")).body).toEqual({ enabled: false });
    expect((await request(app).post("/api/auth/register").send({ name: data.name, email: data.email, password: initialPassword })).status).toBe(403);
    expect(await User.countDocuments()).toBe(0);
    expect(await Empleado.countDocuments()).toBe(0);
  } finally { process.env.NODE_ENV = originalMode; process.env.ALLOW_SELF_REGISTRATION = originalFlag; }
});
test("solo admin crea cuenta y perfil real juntos; bcrypt 12 sin claves ni sesiones en respuesta", async () => {
  expect((await request(app).post("/api/empleados").send(data)).status).toBe(401);
  const employee = await authorization("employee");
  expect((await request(app).post("/api/empleados").set("Authorization", employee).send(data)).status).toBe(403);
  const admin = await authorization();
  const response = await request(app).post("/api/empleados").set("Authorization", admin).send(data);
  expect(response.status).toBe(201);
  expect(response.body.document).toBe(data.document);
  expect(response.body.hireDate).toBe(data.hireDate);
  expect(response.headers["set-cookie"]).toBeUndefined();
  expect(JSON.stringify(response.body)).not.toMatch(/password|\$2[aby]\$/i);
  const user = await User.findOne({ email: data.email }).select("+password");
  expect(user.role).toBe("employee");
  expect(bcrypt.getRounds(user.password)).toBe(12);
  expect(await bcrypt.compare(initialPassword, user.password)).toBe(true);
  expect(await Empleado.countDocuments({ user: user._id })).toBe(1);
});
test("si el documento ya existe revierte la cuenta; rechaza privilegios y claves débiles", async () => {
  const admin = await authorization();
  await Empleado.create({ ...data, user: undefined });
  const response = await request(app).post("/api/empleados").set("Authorization", admin).send(data);
  expect(response.status).toBe(409);
  expect(await User.exists({ email: data.email })).toBeNull();
  for (const change of [{ role: "admin" }, { initialPassword: "short" }, { hireDate: undefined }]) {
    expect((await request(app).post("/api/empleados").set("Authorization", admin).send({ ...data, ...change })).status).toBe(400);
  }
  expect(await User.countDocuments()).toBe(1);
});
test("un JWT firmado con el secreto retirado deja de ser válido", async () => {
  const header = await authorization();
  expect((await request(app).get("/api/auth/me").set("Authorization", header)).status).toBe(200);
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = require("node:crypto").randomBytes(48).toString("base64url");
  try { expect((await request(app).get("/api/auth/me").set("Authorization", header)).status).toBe(401); }
  finally { process.env.JWT_SECRET = oldSecret; }
});
test("producción exige base explícita, TLS verificado y orígenes HTTPS exactos", () => {
  const before = { NODE_ENV: process.env.NODE_ENV, MONGO_URI: process.env.MONGO_URI, APP_ORIGIN: process.env.APP_ORIGIN };
  try {
    process.env.NODE_ENV = "production";
    process.env.APP_ORIGIN = "https://sesha-app.vercel.app";
    for (const uri of ["mongodb+srv://cluster.example", "mongodb+srv://cluster.example/app?tls=false",
      "mongodb+srv://cluster.example/app?tlsAllowInvalidCertificates=true", "mongodb+srv://cluster.example/app?tlsAllowInvalidHostnames=true"]) {
      process.env.MONGO_URI = uri;
      expect(validateConfig).toThrow();
    }
    process.env.MONGO_URI = "mongodb+srv://cluster.example/app";
    expect(validateConfig).not.toThrow();
    for (const origin of ["http://sesha-app.vercel.app", "https://sesha-app.vercel.app/path", "*"]) {
      process.env.APP_ORIGIN = origin;
      expect(validateConfig).toThrow();
    }
  } finally { Object.assign(process.env, before); }
});
