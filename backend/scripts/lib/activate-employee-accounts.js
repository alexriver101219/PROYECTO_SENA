const { isDeepStrictEqual } = require("node:util");
const bcrypt = require("bcryptjs");
const { DEMO_EMAILS } = require("./demo-quarantine");
const { assertExpectedTarget } = require("./password-rotation");
const { newPassword, email: validEmail } = require("../../utils/validation");

function accountPlan(users, profiles) {
  const plan = DEMO_EMAILS.map((oldEmail, index) => {
    const matches = users.filter((user) => user.email === oldEmail);
    if (matches.length !== 1) throw new Error("Deben existir exactamente las 120 cuentas originales");
    const user = matches[0];
    const linked = profiles.filter((profile) => String(profile.user) === String(user._id));
    const suffix = new RegExp(` \\(Demo ${String(index + 1).padStart(3, "0")}\\)$`, "u");
    if (user.role !== "employee" || user.active !== false || linked.length !== 1 ||
        !suffix.test(user.name) || !suffix.test(linked[0].name) ||
        user.name !== linked[0].name || !Number.isSafeInteger(user.sessionVersion) ||
        user.sessionVersion < 0)
      throw new Error("Cuenta o perfil fuera del alcance aprobado");
    const name = user.name.replace(suffix, "").trim();
    if (name.length < 3 || /demo/iu.test(name)) throw new Error("Nombre inesperado");
    const slug = name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/gu, ".");
    const email = validEmail(`${slug}.${String(index + 1).padStart(3, "0")}@sesha.com`);
    if (users.some((other) => other.email === email)) throw new Error("El nuevo correo ya existe");
    return { user, profile: linked[0], name, email };
  });
  if (new Set(plan.map((item) => item.email)).size !== 120) throw new Error("Correos repetidos");
  return plan;
}

async function activateEmployeeAccounts({ client, target, expected, approved, beforeUsers, beforeProfiles, credentials }) {
  assertExpectedTarget(target, expected);
  if (approved !== true) throw new Error("La reactivación requiere autorización explícita");
  const plan = accountPlan(beforeUsers, beforeProfiles);
  if (!Array.isArray(credentials) || credentials.length !== plan.length ||
      new Set(credentials.map((item) => item.password)).size !== plan.length)
    throw new Error("Se requiere una contraseña única por cuenta");
  for (const [index, item] of plan.entries()) {
    const credential = credentials[index];
    newPassword(credential.password);
    if (credential.email !== item.email || bcrypt.getRounds(credential.hash) !== 12 ||
        !await bcrypt.compare(credential.password, credential.hash))
      throw new Error("Credenciales inconsistentes");
  }
  const db = client.db(target.database);
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const users = db.collection("empleados");
      const profiles = db.collection("perfiles_empleados");
      const read = (collection) => collection.find({}, { session }).sort({ _id: 1 }).toArray();
      if (!isDeepStrictEqual(await read(users), beforeUsers) ||
          !isDeepStrictEqual(await read(profiles), beforeProfiles))
        throw new Error("La base cambió desde la inspección; se cancela la operación");
      for (const [index, item] of plan.entries()) {
        const account = await users.updateOne({ _id: item.user._id, email: item.user.email, active: false }, {
          $set: { name: item.name, email: item.email, active: true, password: credentials[index].hash },
          $inc: { sessionVersion: 1 },
        }, { session, upsert: false });
        const profile = await profiles.updateOne({ _id: item.profile._id, user: item.user._id, name: item.profile.name }, {
          $set: { name: item.name, status: "Activo" },
        }, { session, upsert: false });
        if (account.modifiedCount !== 1 || profile.matchedCount !== 1)
          throw new Error("Conflicto de actualización; se revierte toda la operación");
      }
      const byUser = new Map(plan.map((item, index) => [String(item.user._id), { ...item, hash: credentials[index].hash }]));
      const byProfile = new Map(plan.map((item) => [String(item.profile._id), item]));
      const expectedUsers = beforeUsers.map((user) => {
        const item = byUser.get(String(user._id));
        return item ? { ...user, name: item.name, email: item.email, active: true, password: item.hash,
          sessionVersion: user.sessionVersion + 1 } : user;
      });
      const expectedProfiles = beforeProfiles.map((profile) => {
        const item = byProfile.get(String(profile._id));
        return item ? { ...profile, name: item.name, status: "Activo" } : profile;
      });
      if (!isDeepStrictEqual(await read(users), expectedUsers) ||
          !isDeepStrictEqual(await read(profiles), expectedProfiles))
        throw new Error("Cambios fuera del alcance; se revierte toda la operación");
    }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
    return { activated: plan.length, profilesUpdated: plan.length, passwordsRotated: plan.length,
      otherAccountsUnchanged: true, linkedIdsPreserved: true };
  } finally { await session.endSession(); }
}

module.exports = { accountPlan, activateEmployeeAccounts };
