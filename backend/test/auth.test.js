const request = require("supertest");
const app = require("../server");

describe("API Auth", () => {
  describe("GET /", () => {
    test("Debe responder que la API está online", async () => {
      const response = await request(app).get("/");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe("POST /api/auth/register", () => {
    test("Debe rechazar registro sin datos", async () => {
      const response = await request(app).post("/api/auth/register").send({});

      expect(response.status).toBe(400);
      expect(response.body.msg).toBe("Todos los campos son requeridos");
    });
  });

  describe("POST /api/auth/login", () => {
    test("Debe permitir login demo cuando no hay base de datos", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "admin@sesha.com",
        password: "123456",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeTruthy();
    });

    test("Debe rechazar usuario inexistente", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "fake@test.com",
        password: "123456",
      });

      expect(response.status).toBe(404);
      expect(response.body.msg).toBe("Usuario no encontrado");
    });
  });
});
