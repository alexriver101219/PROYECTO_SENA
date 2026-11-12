const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tipo: {
      type: String,
      enum: ["Permiso", "Vacaciones", "Certificado"],
      required: true,
    },
    descripcion: { type: String, required: true, trim: true, maxlength: 2000 },
    estado: {
      type: String,
      enum: ["Pendiente", "Aprobado", "Rechazado"],
      default: "Pendiente",
    },
    documento: { type: mongoose.Schema.Types.ObjectId, ref: "Documento" },
  },
  {
    autoCreate: false,
    autoIndex: false,
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = String(ret._id);
        delete ret.__v;
        return ret;
      },
    },
  },
);
module.exports =
  mongoose.models.Solicitud || mongoose.model("Solicitud", schema);
