const mongoose = require("mongoose");
const { requestTypes } = require("../config/requestTypes");
const { validDateOnly } = require("../utils/dates");
const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true }, document: { type: String, required: true },
  email: { type: String, required: true }, position: { type: String, required: true },
  department: { type: String, required: true },
}, { _id: false });
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
      enum: requestTypes,
      required: true,
    },
    descripcion: { type: String, required: true, trim: true, maxlength: 2000 },
    empleado: { type: employeeSchema, default: undefined },
    fechaSolicitud: { type: String, validate: { validator: validDateOnly, message: "Fecha de solicitud inválida" } },
    fechaPermiso: { type: String, validate: { validator: (value) => value == null || validDateOnly(value), message: "Fecha de permiso inválida" } },
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
