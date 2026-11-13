const crypto = require("crypto");
const Empleado = require("../models/Empleado");
const User = require("../models/User");
const { dateInBogota, validDateOnly } = require("../utils/dates");

function demoHireDate(userId, now = new Date()) {
  const seed = crypto
    .createHash("sha256")
    .update(String(userId))
    .digest()
    .readUInt32BE(0);
  const date = new Date(dateInBogota(now) + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() - 90 - (seed % 1800));
  return date.toISOString().slice(0, 10);
}

async function createDemoProfile(user, { session, job } = {}) {
  const existing = await Empleado.findOne({ user: user._id }).session(
    session || null,
  );
  if (existing) return existing;
  const seed = crypto
    .createHash("sha256")
    .update(String(user._id))
    .digest()
    .readUInt32BE(0);
  let document;
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = String(9700000000 + ((seed + attempt) % 100000000));
    if (
      !(await Empleado.exists({ document: candidate }).session(session || null))
    ) {
      document = candidate;
      break;
    }
  }
  if (!document)
    throw new Error("No se pudo asignar un documento ficticio único");
  const [profile] = await Empleado.create(
    [
      {
        user: user._id,
        name: user.name || user.nombre || "Empleado Sesha",
        document,
        position:
          job?.position ||
          (user.role === "admin" ? "Administrador" : "Auxiliar de operaciones"),
        department:
          job?.department ||
          (user.role === "admin" ? "Administración" : "Operaciones"),
        status: "Activo",
        hireDate: demoHireDate(user._id),
      },
    ],
    session ? { session } : {},
  );
  return profile;
}

async function completeLaborProfiles({ apply = false } = {}) {
  const users = await User.find().sort({ _id: 1 });
  const profiles = await Empleado.collection.find({}).toArray();
  const linked = new Set(
    profiles
      .filter((profile) => profile.user)
      .map((profile) => String(profile.user)),
  );
  const missingUsers = users.filter((user) => !linked.has(String(user._id)));
  const missingDates = profiles.filter(
    (profile) => !validDateOnly(profile.hireDate),
  );
  if (apply) {
    for (const user of missingUsers) await createDemoProfile(user);
    for (const profile of missingDates) {
      await Empleado.updateOne(
        { _id: profile._id },
        { $set: { hireDate: demoHireDate(profile.user || profile._id) } },
        { runValidators: true },
      );
    }
  }
  return {
    users: users.length,
    missingProfiles: missingUsers.length,
    missingHireDates: missingDates.length,
    applied: apply,
  };
}

module.exports = { demoHireDate, createDemoProfile, completeLaborProfiles };
