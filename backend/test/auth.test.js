const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../server");

describe("Pruebas de autenticación con JWT", () => {
  let token;

  test("Login exitoso devuelve token válido", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "juan@test.com",
      password: "123456",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");

    token = res.body.token;

    const decoded = jwt.decode(token);

    expect(decoded.email).toBe("juan@test.com");
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

    expect(res.body.msg).toBeDefined();
  });
});
