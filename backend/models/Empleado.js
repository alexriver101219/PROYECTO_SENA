const mongoose = require("mongoose");

const empleadoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    documento: { type: String, required: true, trim: true },
    cargo: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
  },
  { timestamps: true },
);

// Evita OverwriteModelError reutilizando el modelo si ya existe
module.exports =
  mongoose.models.Empleado || mongoose.model("Empleado", empleadoSchema);
