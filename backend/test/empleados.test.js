const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const app = require("../server");

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    const MONGO_URI =
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tu_bd_test";
    await mongoose.connect(MONGO_URI);
  }
}, 30000);

const JWT_SECRET =
  process.env.JWT_SECRET || "claveSuperSecretaRobustaGeneradaConOpenSSL";

describe("Pruebas módulo Empleados", () => {
  let token;

  beforeAll(async () => {
    // Esperamos a que Mongoose esté realmente conectado
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        mongoose.connection.once("open", resolve);
      });
    }

    token = jwt.sign(
      {
        id: "60d0fe4f5311236168a109ca",
        _id: "60d0fe4f5311236168a109ca",
        email: "admin@test.com",
        rol: "admin",
      },
      JWT_SECRET,
      { expiresIn: "1h" },
    );
  });

  test("Consultar empleados", async () => {
    const response = await request(app)
      .get("/api/empleados")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
  });

  test("Crear empleado", async () => {
    const response = await request(app)
      .post("/api/empleados")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Carlos Pérez",
        nombre: "Carlos Pérez",
        documento: `DOC${Date.now()}`,
        cargo: "Supervisor",
        email: `carlos${Date.now()}@test.com`,
        password: "Test123Password!",
        telefono: "3001234567",
        estado: "activo",
        rol: "empleado",
      });

    expect([200, 201]).toContain(response.statusCode);
  });
});
