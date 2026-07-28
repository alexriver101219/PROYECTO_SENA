const mongoose = require("mongoose");

const empleadoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    documento: { type: String, required: true, trim: true },
    cargo: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Empleado", empleadoSchema);
