// ==========================
// Dependencias
// ==========================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const dotenv = require("dotenv");

dotenv.config();

// ==========================
// Inicialización
// ==========================
const app = express();
const PORT = process.env.PORT || 8000;
const isTestEnvironment =
  process.env.NODE_ENV === "test" || Boolean(process.env.JEST_WORKER_ID);
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:5173",
];

// ==========================
// Middlewares de seguridad
// ==========================
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin no permitida por CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "10kb" }));
app.use(morgan("combined"));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Demasiadas solicitudes desde esta IP, intenta más tarde.",
});
app.use("/api", limiter);

// ==========================
// Rutas
// ==========================
app.get("/api/test", (req, res) => {
  res.json({ msg: "Servidor seguro funcionando ✅" });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/empleados", require("./routes/empleados"));
app.use("/api/documentos", require("./routes/documentos"));
app.use("/api/solicitudes", require("./routes/solicitudes"));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    application: "SESHA APP API",
    version: "1.0.0",
    status: "Online",
    timestamp: new Date().toISOString(),
  });
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
  });
});

// ==========================
// Conexión MongoDB y arranque
// ==========================
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.log("ℹ️ No se encontró MONGO_URI; se omite la conexión a MongoDB");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Atlas conectado");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

// Solo inicia el servidor si NO estamos ejecutando pruebas
if (!isTestEnvironment) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
    });
  });
}

module.exports = app;
