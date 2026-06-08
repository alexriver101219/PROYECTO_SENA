const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

// ==========================
// Configuración
// ==========================
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// ==========================
// Middlewares
// ==========================
app.use(cors());

app.use(
  express.json({
    limit: "10mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
  }),
);

// 🔥 IMPORTANTE: RUTAS
app.use("/api/auth", require("./routes/auth"));

// ==========================
// Ruta principal
// ==========================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    application: "SESHA APP API",
    version: "1.0.0",
    status: "Online",
    timestamp: new Date().toISOString(),
  });
});

// ==========================
// Rutas API
// ==========================

// const authRoutes = require("./routes/auth");
// app.use("/api/auth", authRoutes);

// ==========================
// Manejo de errores 404
// ==========================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
  });
});

// ==========================
// Conexión MongoDB
// ==========================
const connectDB = async () => {
  console.log("Entrando a connectDB...");

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

// ==========================
// Iniciar servidor
// ==========================
connectDB();
