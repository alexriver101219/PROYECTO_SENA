const { csrfProtection } = require("./services/session");
const { MongoRateLimitStore } = require("./services/rateLimitStore");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const { connectDB } = require("./config/db");
const { asyncHandler, HttpError, errorHandler } = require("./utils/http");
const { authenticate, scope } = require("./middlewares/authMiddleware");
const Documento = require("./models/Documento");
const Solicitud = require("./models/Solicitud");
const Empleado = require("./models/Empleado");
function createApp({ database = connectDB, limits = true } = {}) {
  const app = express();
  app.disable("x-powered-by");
  if (process.env.VERCEL) app.set("trust proxy", 1);
  app.use(helmet());
  const allowed = (process.env.APP_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim());
  for (const host of [
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ])
    if (host) allowed.push("https://" + host);
  app.use(
    cors({
      origin: (origin, callback) =>
        callback(
          origin && !allowed.includes(origin)
            ? new HttpError(403, "Origen no permitido")
            : null,
          true,
        ),
    }),
  );
  app.get("/api/health", (_req, res) => res.json({ status: "alive" }));
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "16kb" }));
  app.use(
    "/api",
    asyncHandler(async (_req, _res, next) => {
      try {
        await database();
      } catch {
        throw new HttpError(
          503,
          "La base de datos no está disponible. Intenta más tarde.",
        );
      }
      next();
    }),
  );
  if (limits) {
    app.use(
      "/api",
      rateLimit({
        store: new MongoRateLimitStore("api"),
        windowMs: 60000,
        limit: 120,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message: { message: "Demasiadas solicitudes. Intenta en un minuto." },
      }),
    );
    app.use(
      "/api/auth",
      rateLimit({
        store: new MongoRateLimitStore("auth"),
        windowMs: 15 * 60000,
        limit: 20,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        skip: (req) => req.method === "GET",
        message: {
          message: "Demasiados intentos de acceso. Espera 15 minutos.",
        },
      }),
    );
  }
  app.use("/api", csrfProtection);
  app.get("/api/ready", (_req, res) => res.json({ status: "ready" }));
  app.use("/api/auth", require("./routes/auth"));
  app.use("/api/empleados", require("./routes/empleados"));
  app.use("/api/documentos", require("./routes/documentos"));
  app.use("/api/solicitudes", require("./routes/solicitudes"));
  app.get(
    "/api/dashboard",
    authenticate,
    asyncHandler(async (req, res) => {
      const filter = scope(req);
      const [documentos, solicitudes, pendientes, empleados] =
        await Promise.all([
          Documento.countDocuments(filter),
          Solicitud.countDocuments(filter),
          Solicitud.countDocuments({ ...filter, estado: "Pendiente" }),
          req.user.role === "admin"
            ? Empleado.countDocuments({ status: "Activo" })
            : Promise.resolve(null),
        ]);
      res.json({ documentos, solicitudes, pendientes, empleados });
    }),
  );
  app.use((_req, _res, next) => next(new HttpError(404, "Ruta no encontrada")));
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };
