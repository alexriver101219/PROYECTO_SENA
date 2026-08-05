const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../server");// tu archivo principal de Express

describe("Pruebas de autenticación con JWT", () => {
  let token;

  test("Login exitoso devuelve un token válido", async () => {
    const res = await request(app)
      .post("/api/empleados/login")
      .send({ email: "juan@test.com", password: "tuPasswordCorrecta" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");

    token = res.body.token;

    // Evidencia QA: mostrar token en consola
    console.log("Token generado:", token);
  });

  test("El token contiene datos válidos del empleado", () => {
    const decoded = jwt.decode(token);

    expect(decoded).toHaveProperty("id");
    expect(decoded).toHaveProperty("email", "juan@test.com");
    expect(decoded).toHaveProperty("rol");

    // Evidencia QA: mostrar payload en consola
    console.log("Payload decodificado:", decoded);
  });

  test("Ruta protegida responde con token válido", async () => {
    const res = await request(app)
      .get("/api/solicitudes")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // Evidencia QA: mostrar respuesta en consola
    console.log("Respuesta de ruta protegida:", res.body);
  });
});
