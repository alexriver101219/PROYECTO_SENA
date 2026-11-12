const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    _id: String,
    hits: { type: Number, default: 0 },
    resetTime: { type: Date, required: true, expires: 0 },
  },
  { autoCreate: false, autoIndex: false, versionKey: false },
);
module.exports =
  mongoose.models.RateLimit || mongoose.model("RateLimit", schema);
