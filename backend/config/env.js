const canSelfRegister = () => process.env.NODE_ENV !== "production" && process.env.ALLOW_SELF_REGISTRATION === "true";
function validateConfig() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI es obligatorio");
  if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32)
    throw new Error("JWT_SECRET debe contener al menos 32 bytes");
  if (process.env.NODE_ENV === "production" && !process.env.APP_ORIGIN)
    throw new Error("APP_ORIGIN es obligatorio en producción");
  if (process.env.NODE_ENV === "production") {
    try {
      const { MongoClient } = require("mongoose").mongo;
      const client = new MongoClient(process.env.MONGO_URI);
      const options = client.options;
      const local = !options.srvHost && options.hosts.length > 0 &&
        options.hosts.every((host) => ["localhost", "127.0.0.1", "::1"].includes(host.host));
      const databasePath = process.env.MONGO_URI.replace(/^mongodb(?:\+srv)?:\/\/[^/]+/u, "").split("?")[0];
      if (!/^\/[^/]+$/u.test(databasePath) || (!local && options.tls !== true) ||
          options.rejectUnauthorized === false || typeof options.checkServerIdentity === "function" || options.tlsInsecure)
        throw new Error("Configuración MongoDB no segura");
      for (const origin of process.env.APP_ORIGIN.split(",")) {
        const url = new URL(origin.trim());
        if (url.origin !== origin.trim() || url.protocol !== "https:" || url.username || url.password)
          throw new Error("Origen no seguro");
      }
    } catch {
      throw new Error("Verifica la base explícita, TLS de MongoDB y los orígenes HTTPS de producción");
    }
  }
}
module.exports = { validateConfig, canSelfRegister };
