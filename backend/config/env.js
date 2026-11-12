function validateConfig() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI es obligatorio");
  if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32)
    throw new Error("JWT_SECRET debe contener al menos 32 bytes");
  if (process.env.NODE_ENV === "production" && !process.env.APP_ORIGIN)
    throw new Error("APP_ORIGIN es obligatorio en producción");
}
module.exports = { validateConfig };
