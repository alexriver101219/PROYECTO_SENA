const request = require("supertest");
const app = require("../server");

describe("Pruebas módulo Empleados", () => {
  let token;

  beforeAll(async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "juan@test.com",
      password: "123456",
    });

    expect(loginRes.statusCode).toBe(200);

    token = loginRes.body.token;
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
        nombre: "Carlos",
        documento: "12345678",
        cargo: "Supervisor",
        email: `carlos${Date.now()}@test.com`,
        password: "Test123!",
      });

    expect(response.statusCode).toBe(201);
  });
});
