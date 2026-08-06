const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const app = require("../server");

beforeAll(async () => {
  // Conectar directamente si Mongoose está desconectado
  if (mongoose.connection.readyState === 0) {
    const MONGO_URI =
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tu_bd_test";
    await mongoose.connect(MONGO_URI);
  }
}, 30000);

const JWT_SECRET =
  process.env.JWT_SECRET || "claveSuperSecretaRobustaGeneradaConOpenSSL";

describe("Pruebas de autenticación con JWT", () => {
  let token;
  const userTest = {
    name: "Juan Test",
    nombre: "Juan Test",
    apellido: "Test",
    documento: `DOC_${Date.now()}`,
    cargo: "Administrador",
    email: `juan_${Date.now()}@test.com`,
    password: "123456Password!",
    telefono: "3000000000",
    estado: "activo",
    rol: "admin",
  };

  beforeAll(async () => {
    // 1. Esperamos activamente si la conexión de Mongoose aún no está lista (readyState 1 = conectado)
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        mongoose.connection.once("open", resolve);
      });
    }

    const tempAdminToken = jwt.sign(
      {
        id: "60d0fe4f5311236168a109ca",
        _id: "60d0fe4f5311236168a109ca",
        email: "admin@test.com",
        rol: "admin",
      },
      JWT_SECRET,
      { expiresIn: "1h" },
    );

    const regRes = await request(app)
      .post("/api/empleados")
      .set("Authorization", `Bearer ${tempAdminToken}`)
      .send(userTest);

    if (regRes.statusCode !== 200 && regRes.statusCode !== 201) {
      console.log(
        "🔴 ERROR CREANDO USUARIO EN BEFOREALL:",
        regRes.statusCode,
        regRes.body,
      );
    }
  });

  test("Login exitoso devuelve token válido", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: userTest.email,
      password: userTest.password,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");

    token = res.body.token;

    const decoded = jwt.decode(token);
    expect(decoded.email).toBe(userTest.email);
  });

  test("Ruta protegida responde con token válido", async () => {
    const res = await request(app)
      .get("/api/empleados")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
  });

  test("Login falla con credenciales inválidas", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "fake@test.com",
      password: "123456",
    });

    expect([400, 401, 404]).toContain(res.statusCode);
  });
});
