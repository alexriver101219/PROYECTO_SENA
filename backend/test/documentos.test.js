const request = require("supertest");
const app = require("../server");

describe("Pruebas módulo Documentos", () => {
  test("Consultar documentos", async () => {
    const response = await request(app).get("/api/documentos");
    expect(response.statusCode).toBe(200);
  });

  test("Crear documento", async () => {
    const response = await request(app).post("/api/documentos").send({
      nombre: "Cedula.pdf",
      tipo: "PDF",
    });
    expect(response.statusCode).toBe(201);
  });
});
