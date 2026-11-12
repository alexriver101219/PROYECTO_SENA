const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    nombre: { type: String, required: true, maxlength: 150 },
    tipo: { type: String, enum: ["application/pdf"], required: true },
    size: { type: Number, required: true, max: 3 * 1024 * 1024 },
    data: { type: Buffer, required: true, select: false },
  },
  {
    autoCreate: false,
    autoIndex: false,
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = String(ret._id);
        delete ret.data;
        delete ret.__v;
        return ret;
      },
    },
  },
);
module.exports =
  mongoose.models.Documento || mongoose.model("Documento", schema);
