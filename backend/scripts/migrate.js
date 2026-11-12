if (require.main === module)
  require("dotenv").config({
    quiet: true,
    path: require("path").join(__dirname, "../.env"),
  });
const mongoose = require("mongoose");
const User = require("../models/User");
const Empleado = require("../models/Empleado");
const Documento = require("../models/Documento");
const Solicitud = require("../models/Solicitud");
const RateLimit = require("../models/RateLimit");
const { connectDB } = require("../config/db");
const { validateConfig } = require("../config/env");
async function migrate() {
  validateConfig();
  await connectDB();
  // Migración explícita y repetible: conserva los documentos históricos.
  await User.collection.updateMany(
    { role: { $exists: false } },
    { $set: { role: "employee" } },
  );
  await User.collection.updateMany(
    { active: { $exists: false } },
    { $set: { active: true } },
  );
  for await (const account of User.collection.find({
    nombre: { $type: "string" },
  })) {
    if (!account.name)
      await User.collection.updateOne(
        { _id: account._id },
        { $set: { name: account.nombre } },
      );
    if (/^\d{7,10}$/.test(account.documento || "") && account.cargo) {
      await Empleado.updateOne(
        { user: account._id },
        {
          $setOnInsert: {
            user: account._id,
            name: account.name || account.nombre,
            document: account.documento,
            position: account.cargo,
            department: account.departamento || "Sin especificar",
            status: "Activo",
          },
        },
        { upsert: true, runValidators: true },
      );
    }
  }
  const indexes = await User.collection.indexes().catch((error) => {
    if (error.code === 26) return [];
    throw error;
  });
  const legacy = indexes.find(
    (index) =>
      index.name === "username_1" &&
      Object.keys(index.key).length === 1 &&
      index.key.username === 1,
  );
  if (legacy) await User.collection.dropIndex(legacy.name);
  for (const Model of [User, Empleado, Documento, Solicitud, RateLimit])
    await Model.createIndexes();
  console.log(
    "Migración completada. Los registros históricos sin propietario se conservan para revisión del administrador.",
  );
}
if (require.main === module)
  migrate()
    .catch((error) => {
      console.error("Migración incompleta:", error.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
module.exports = { migrate };
