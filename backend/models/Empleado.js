const mongoose = require("mongoose");
const { dateInBogota, validDateOnly } = require("../utils/dates");
const schema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    document: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{7,10}$/,
    },
    position: { type: String, required: true, trim: true, maxlength: 100 },
    department: { type: String, required: true, trim: true, maxlength: 100 },
    status: { type: String, enum: ["Activo", "Inactivo"], default: "Activo" },
    hireDate: {
      type: String,
      required: true,
      default: () => dateInBogota(),
      validate: {
        validator: (value) =>
          validDateOnly(value) &&
          value >= "1950-01-01" &&
          value <= dateInBogota(),
        message: "Fecha de ingreso inválida",
      },
    },
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
  mongoose.models.Empleado ||
  mongoose.model("Empleado", schema, "perfiles_empleados");
