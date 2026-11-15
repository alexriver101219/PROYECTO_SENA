// Carga académica explícita. Sin --apply solo comprueba el plan y las colisiones.
if (require.main === module) require("dotenv").config({
  path: require("path").join(__dirname, "../.env"),
  quiet: true,
});
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Empleado = require("../models/Empleado");
const { demoHireDate } = require("../services/laborProfiles");

const COUNT = 120;
const { passwordFromEnv } = require("./lib/password-input");
const firstNames = [
  "Ana",
  "Carlos",
  "Laura",
  "Andrés",
  "Camila",
  "Daniel",
  "Sofía",
  "Miguel",
  "Valentina",
  "Jorge",
  "Paula",
  "Mateo",
];
const lastNames = [
  "García",
  "Rodríguez",
  "López",
  "Martínez",
  "Hernández",
  "Pérez",
  "Gómez",
  "Sánchez",
  "Díaz",
  "Ramírez",
];
const jobs = [
  ["Operaciones", "Guarda de seguridad"],
  ["Talento Humano", "Analista de talento humano"],
  ["Tecnología", "Auxiliar de tecnología"],
  ["Administración", "Asistente administrativo"],
  ["Operaciones", "Coordinador de operaciones"],
];

async function main() {
  const password = process.argv.includes("--apply")
    ? passwordFromEnv("DEMO_EMPLOYEES_PASSWORD")
    : undefined;
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI no configurado");
  await mongoose.connect(process.env.MONGO_URI, {
    autoIndex: false,
    autoCreate: false,
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
  });
  const plan = Array.from({ length: COUNT }, (_, i) => {
    const number = String(i + 1).padStart(3, "0");
    const [department, position] = jobs[i % jobs.length];
    return {
      _id: new mongoose.Types.ObjectId(),
      name: `${firstNames[i % firstNames.length]} ${lastNames[Math.floor(i / firstNames.length)]} (Demo ${number})`,
      email: `demo.exposicion.${number}@sesha.com`,
      document: String(9900000001 + i),
      department,
      position,
    };
  });
  const emails = plan.map((entry) => entry.email);
  const documents = plan.map((entry) => entry.document);
  const before = await User.countDocuments();
  const accountCollisions = await User.collection.countDocuments({
    email: { $in: emails },
  });
  const profileCollisions = await Empleado.collection.countDocuments({
    document: { $in: documents },
  });
  const indexes = await User.collection.indexes();
  const summary = {
    mode: process.argv.includes("--apply") ? "apply" : "preview",
    accountsBefore: before,
    accountsToAdd: COUNT,
    profilesToAdd: COUNT,
    accountCollisions,
    profileCollisions,
    emailExample: emails[0],
    existingUniqueIndexes: indexes
      .filter((index) => index.unique)
      .map((index) => index.name),
  };
  console.log(JSON.stringify(summary));
  if (accountCollisions || profileCollisions)
    throw new Error(
      "Hay registros de esta carga o documentos en uso; no se modificó ningún registro",
    );
  if (!process.argv.includes("--apply")) return;

  // Cada cuenta recibe su propia sal bcrypt aunque comparta la clave académica.
  const accounts = [];
  for (const entry of plan) {
    const user = new User({
      _id: entry._id,
      name: entry.name,
      email: entry.email,
      role: "employee",
      active: true,
      password: await bcrypt.hash(password, 12),
    });
    await user.validate();
    const data = user.toObject();
    // Compatibilidad con un índice antiguo, sin eliminarlo ni cambiar cuentas existentes.
    if (indexes.some((index) => index.unique && index.key.username === 1))
      data.username = entry.email.split("@")[0];
    accounts.push(data);
  }
  const now = new Date();
  for (const account of accounts) {
    account.createdAt = now;
    account.updatedAt = now;
  }
  const profiles = plan.map(
    (entry) =>
      new Empleado({
        user: entry._id,
        name: entry.name,
        document: entry.document,
        department: entry.department,
        position: entry.position,
        status: "Activo",
        hireDate: demoHireDate(entry._id),
      }),
  );
  for (const profile of profiles) await profile.validate();
  await Empleado.createCollection();
  await Empleado.createIndexes();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await User.collection.insertMany(accounts, { session });
      await Empleado.insertMany(
        profiles.map((profile) => profile.toObject()),
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  const addedAccounts = await User.collection.countDocuments({
    email: { $in: emails },
  });
  const addedProfiles = await Empleado.collection.countDocuments({
    user: { $in: plan.map((entry) => entry._id) },
  });
  const total = await User.countDocuments();
  if (addedAccounts !== COUNT || addedProfiles !== COUNT)
    throw new Error(
      "La verificación del conteo no coincide; revisar la carga antes de repetirla",
    );
  console.log(
    JSON.stringify({
      result: "verified",
      addedAccounts,
      addedProfiles,
      totalAccounts: total,
    }),
  );
}

if (require.main === module) main()
  .catch((error) => {
    console.error(
      "Carga no completada:",
      error.name,
      error.code || "",
      error.message?.includes("registros de esta carga")
        ? "Carga existente: se evitó duplicarla"
        : "Revisa la configuración o los índices; no se imprimieron credenciales",
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());

module.exports = { main };
