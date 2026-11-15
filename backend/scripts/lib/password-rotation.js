const { MongoClient } = require("mongoose").mongo;
const bcrypt = require("bcryptjs");
const { validateNewPassword } = require("./password-input");

const EMAILS = Object.freeze(["admin@sesha.com", "carlos.mendoza@sesha.com"]);
const COLLECTION = "empleados"; // Colección histórica de User; no perfiles_empleados.

function createMaintenanceClient(uri) {
  if (!uri || !/^mongodb(?:\+srv)?:\/\//u.test(uri))
    throw new Error("Configura MONGO_URI de forma privada");
  let client;
  try {
    client = new MongoClient(uri, {
      maxPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      monitorCommands: false,
      mongodbLogComponentSeverities: { default: "off" },
    });
  } catch {
    throw new Error("MONGO_URI inválida; detalles omitidos");
  }
  const path = uri.replace(/^mongodb(?:\+srv)?:\/\/[^/]+/u, "").split("?")[0];
  if (!/^\/[^/]+$/u.test(path))
    throw new Error("MONGO_URI debe indicar una base explícita");
  const options = client.options;
  const host = options.srvHost || options.hosts.map((item) => item.toString()).join(",");
  const localOnly = !options.srvHost && options.hosts.length > 0 &&
    options.hosts.every((item) => ["127.0.0.1", "localhost", "::1"].includes(item.host));
  // El driver traduce las opciones URI de validación TLS a estas propiedades.
  if ((!localOnly && options.tls !== true) || options.rejectUnauthorized === false ||
      typeof options.checkServerIdentity === "function" || options.tlsInsecure)
    throw new Error("La conexión de mantenimiento requiere TLS válido en Atlas");
  return { client, target: Object.freeze({ host, database: options.dbName, collection: COLLECTION }) };
}

function assertExpectedTarget(target, expected) {
  if (!expected || expected.host !== target.host || expected.database !== target.database)
    throw new Error("El destino no coincide con el host y la base autorizados");
}

async function inspectAccounts(db) {
  const accounts = await db.collection(COLLECTION).find(
    { email: { $in: EMAILS } },
    { projection: { _id: 1, email: 1 } },
  ).toArray();
  for (const email of EMAILS)
    if (accounts.filter((account) => account.email === email).length !== 1)
      throw new Error("Deben existir exactamente las dos cuentas, sin duplicados; no se crean cuentas");
  return accounts;
}

async function rotatePasswords({ client, target, expected, approved, passwords }) {
  assertExpectedTarget(target, expected);
  if (approved !== true) throw new Error("Se requiere autorización explícita");
  if (!Array.isArray(passwords) || passwords.length !== EMAILS.length)
    throw new Error("Se requieren las dos nuevas claves");
  passwords.forEach(validateNewPassword);
  if (passwords[0] === passwords[1]) throw new Error("Usa claves diferentes para cada cuenta");
  const db = client.db(target.database);
  const hashes = await Promise.all(passwords.map((value) => bcrypt.hash(value, 12)));
  const session = client.startSession();
  try {
    // Atlas replica set: ambas actualizaciones se confirman juntas o ninguna.
    await session.withTransaction(async () => {
      const collection = db.collection(COLLECTION);
      const accounts = await collection.find({ email: { $in: EMAILS } }, {
        session, projection: { _id: 1, email: 1, password: 1 },
      }).toArray();
      for (let index = 0; index < EMAILS.length; index++) {
        const matches = accounts.filter((account) => account.email === EMAILS[index]);
        if (matches.length !== 1 || typeof matches[0].password !== "string")
          throw new Error("Cuentas ausentes, duplicadas o inválidas; transacción cancelada");
        const account = matches[0];
        if (await bcrypt.compare(passwords[index], account.password))
          throw new Error("La nueva clave debe diferir de la anterior");
        const result = await collection.updateOne(
          { _id: account._id, email: account.email, password: account.password },
          { $set: { password: hashes[index] }, $inc: { sessionVersion: 1 } },
          { session, upsert: false },
        );
        if (result.matchedCount !== 1 || result.modifiedCount !== 1)
          throw new Error("Conflicto de actualización; transacción cancelada");
      }
    }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
  } finally {
    hashes.fill("");
    await session.endSession();
  }
}

module.exports = { EMAILS, COLLECTION, createMaintenanceClient, assertExpectedTarget, inspectAccounts, rotatePasswords };
