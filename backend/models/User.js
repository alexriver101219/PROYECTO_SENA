const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "employee"], default: "employee" },
    sessionVersion: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  {
    autoCreate: false,
    autoIndex: false,
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = String(ret._id);
        delete ret.password;
        delete ret.sessionVersion;
        delete ret.__v;
        return ret;
      },
    },
  },
);
// Conserva las cuentas históricas; el perfil laboral tiene una colección independiente.
module.exports =
  mongoose.models.User || mongoose.model("User", schema, "empleados");
