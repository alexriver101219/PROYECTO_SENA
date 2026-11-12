const mongoose = require("mongoose");
mongoose.set("bufferCommands", false);
mongoose.set("sanitizeFilter", true);
let connecting;
async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI no configurado");
  if (!connecting)
    connecting = mongoose
      .connect(process.env.MONGO_URI, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        autoIndex: process.env.NODE_ENV !== "production",
      })
      .catch((error) => {
        connecting = null;
        throw error;
      });
  await connecting;
  return mongoose.connection;
}
module.exports = { connectDB };
