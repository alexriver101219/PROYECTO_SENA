require("dotenv").config({
  path: require("path").join(__dirname, "../.env"),
  quiet: true,
});
const mongoose = require("mongoose");
const User = require("../models/User");
const Empleado = require("../models/Empleado");
const laborPositions = require("../config/laborPositions");

const quotas = [
  ["Coordinador de operaciones", 4],
  ["Asistente administrativo", 4],
  ["Auxiliar de tecnología", 4],
  ["Supervisor", 4],
  ["Auxiliar de operaciones", 6],
  ["Analista de talento humano", 2],
];
const aliases = {
  "Coordinador de logística": "Coordinador de operaciones",
  Supervisora: "Supervisor",
};

async function redistribute(session, apply) {
  const admins = await User.find({ role: "admin" })
    .select("_id")
    .session(session);
  const adminIds = new Set(admins.map((user) => String(user._id)));
  const profiles = await Empleado.find()
    .sort({ _id: 1 })
    .lean()
    .session(session);
  const staff = profiles.filter(
    (profile) => !adminIds.has(String(profile.user)),
  );
  const required = quotas.reduce((sum, [, count]) => sum + count, 0);
  if (staff.length < required)
    throw new Error("Personal insuficiente para las cuotas");
  const assigned = new Map();
  for (const [position, count] of quotas) {
    const matches = staff.filter(
      (profile) => (aliases[profile.position] || profile.position) === position,
    );
    for (const profile of matches.slice(0, count))
      assigned.set(String(profile._id), position);
  }
  const available = staff.filter(
    (profile) => !assigned.has(String(profile._id)),
  );
  for (const [position, count] of quotas) {
    const existing = [...assigned.values()].filter(
      (value) => value === position,
    ).length;
    for (let index = existing; index < count; index++) {
      const profile = available.shift();
      assigned.set(String(profile._id), position);
    }
  }
  for (const profile of available)
    assigned.set(String(profile._id), "Guarda de seguridad");
  const updates = [];
  const counts = {};
  for (const profile of profiles) {
    const position = assigned.get(String(profile._id)) || profile.position;
    counts[position] = (counts[position] || 0) + 1;
    if (!assigned.has(String(profile._id))) continue;
    const { department } = laborPositions.find(
      (job) => job.position === position,
    );
    if (profile.position !== position || profile.department !== department)
      updates.push({
        updateOne: {
          filter: { _id: profile._id },
          update: { $set: { position, department } },
        },
      });
  }
  if (apply && updates.length) await Empleado.bulkWrite(updates, { session });
  return {
    total: profiles.length,
    changes: updates.length,
    counts,
    applied: apply,
  };
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI no configurado");
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 8000,
    autoIndex: false,
    autoCreate: false,
  });
  const apply = process.argv.includes("--apply");
  const result = await mongoose.connection.transaction((session) =>
    redistribute(session, apply),
  );
  console.log(JSON.stringify(result));
}
main()
  .catch(() => {
    console.error("No se pudo completar la redistribución de cargos");
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
