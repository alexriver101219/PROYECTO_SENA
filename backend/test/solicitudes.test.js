const request = require("supertest");
const app = require("../server");

describe("Pruebas módulo Solicitudes", () => {
  test("Consultar solicitudes", async () => {
    const response = await request(app).get("/api/solicitudes");
    expect(response.statusCode).toBe(200);
  });

  test("Crear solicitud", async () => {
    const response = await request(app).post("/api/solicitudes").send({
      tipo: "Certificación laboral",
      descripcion: "Solicitud de certificado",
    });
    expect(response.statusCode).toBe(201);
  });
});
