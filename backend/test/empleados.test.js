const request = require("supertest");
const app = require("../server");

describe("Pruebas módulo Empleados", () => {
  test("Consultar empleados", async () => {
    const response = await request(app).get("/api/empleados");

    expect(response.statusCode).toBe(200);
  });

  test("Crear empleado", async () => {
    const response = await request(app).post("/api/empleados").send({
      nombre: "Carlos",
      documento: "12345678",
      cargo: "Supervisor",
    });

    expect(response.statusCode).toBe(201);
  });
});
