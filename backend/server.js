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

// ==========================
// Middlewares de seguridad
// ==========================
app.use(helmet());
app.use(cors({ origin: "http://localhost:5173" }));
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
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Atlas conectado");

    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error de conexión MongoDB");
    console.error(error.message);
    process.exit(1);
  }
};

connectDB();
