const mongoose = require("mongoose");

const solicitudSchema = new mongoose.Schema(
  {
    tipo: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Solicitud", solicitudSchema);
