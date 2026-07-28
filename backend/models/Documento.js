const mongoose = require("mongoose");

const documentoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    tipo: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Documento", documentoSchema);
