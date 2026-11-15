const { isDeepStrictEqual } = require("node:util");
const { randomInt } = require("node:crypto");
const bcrypt = require("bcryptjs");
const { assertExpectedTarget } = require("./password-rotation");
const { email: validEmail, newPassword } = require("../../utils/validation");

function completionPlan(users, profiles, preservedEmails) {
  if (users.length !== 152 || profiles.length !== 152 || preservedEmails.length !== 120 ||
      new Set(preservedEmails).size !== 120 || new Set(users.map((u) => String(u._id))).size !== 152 ||
      new Set(profiles.map((p) => String(p._id))).size !== 152)
    throw new Error("El alcance debe ser de 152 cuentas y perfiles, con 120 accesos conservados");
  const admins = users.filter((user) => user.role === "admin");
  if (admins.length !== 1 || admins[0].email !== "admin@sesha.com")
    throw new Error("Administrador inesperado");
  for (const user of users) {
    if (!["admin", "employee"].includes(user.role) || typeof user.active !== "boolean" ||
        (user.sessionVersion !== undefined && (!Number.isSafeInteger(user.sessionVersion) || user.sessionVersion < 0)) ||
        profiles.filter((p) => String(p.user) === String(user._id)).length !== 1)
      throw new Error("Cuenta o vínculo inesperado");
  }
  for (const [index, email] of preservedEmails.entries()) {
    const match = users.filter((user) => user.email === email && user.role === "employee" && user.active);
    if (match.length !== 1 || !email.endsWith(`.${String(index + 1).padStart(3, "0")}@sesha.com`))
      throw new Error("Los 120 accesos anteriores no coinciden");
  }
  const remaining = users.filter((user) => user.role === "employee" && !preservedEmails.includes(user.email))
    .sort((a, b) => String(a._id).localeCompare(String(b._id)));
  if (remaining.length !== 31) throw new Error("Deben existir 31 cuentas adicionales");
  const accounts = remaining.map((user, index) => {
    const slug = user.name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/gu, ".").replace(/^\.+|\.+$/gu, "");
    const sequence = index + 121;
    const email = validEmail(`${slug}.${sequence}@sesha.com`);
    if (users.some((other) => other.email === email)) throw new Error("Correo nuevo en uso o plan ya completado");
    return { user, email, sequence };
  });
  if (new Set(accounts.map((item) => item.email)).size !== 31) throw new Error("Correos duplicados");
  return { accounts, admin: admins[0] };
}

function variedDocuments(profiles) {
  const used = new Set(profiles.map((profile) => profile.document));
  return profiles.map((profile, index) => {
    const category = index % 10;
    const [min, max] = category < 6 ? [12000000, 96000000]
      : category < 9 ? [1010000000, 1200000000] : [110000000, 900000000];
    for (let attempt = 0; attempt < 1000; attempt++) {
      const document = String(randomInt(min, max));
      if (used.has(document) || /^(97|99|100000)/u.test(document) ||
          /(\d)\1{3}/u.test(document) || /12345|54321|67890|98765/u.test(document)) continue;
      used.add(document);
      return { profileId: profile._id, document };
    }
    throw new Error("No se pudo generar un documento académico único");
  });
}

function projectedDataset({ beforeUsers, beforeProfiles, preservedEmails, credentials, documents }) {
  const plan = completionPlan(beforeUsers, beforeProfiles, preservedEmails);
  if (!Array.isArray(credentials) || credentials.length !== 31 ||
      new Set(credentials.map((item) => item.password)).size !== 31)
    throw new Error("Se requieren 31 claves nuevas y únicas");
  for (const [index, item] of plan.accounts.entries()) {
    const credential = credentials[index];
    newPassword(credential.password);
    if (credential.email !== item.email || String(credential.userId) !== String(item.user._id) ||
        bcrypt.getRounds(credential.hash) !== 12) throw new Error("Credenciales inconsistentes");
  }
  if (!Array.isArray(documents) || documents.length !== 152 ||
      new Set(documents.map((item) => String(item.profileId))).size !== 152 ||
      new Set(documents.map((item) => item.document)).size !== 152)
    throw new Error("Se requieren 152 documentos únicos");
  const oldDocuments = new Set(beforeProfiles.map((profile) => profile.document));
  for (const item of documents) {
    if (!beforeProfiles.some((profile) => String(profile._id) === String(item.profileId)) ||
        typeof item.document !== "string" || !/^\d{7,10}$/u.test(item.document) ||
        /^(97|99|100000)/u.test(item.document) || oldDocuments.has(item.document))
      throw new Error("Documento fuera del alcance o del formato permitido");
  }
  const byUser = new Map(credentials.map((item) => [String(item.userId), item]));
  const byProfile = new Map(documents.map((item) => [String(item.profileId), item]));
  const users = beforeUsers.map((user) => {
    const item = byUser.get(String(user._id));
    return item ? { ...user, email: item.email, password: item.hash, active: true,
      sessionVersion: (user.sessionVersion ?? 0) + 1 } : user;
  });
  const activated = new Set(credentials.map((item) => String(item.userId)));
  const profiles = beforeProfiles.map((profile) => ({ ...profile,
    document: byProfile.get(String(profile._id)).document,
    ...(activated.has(String(profile.user)) ? { status: "Activo" } : {}),
  }));
  return { users, profiles, plan };
}

async function completeEmployeeDataset(input) {
  const { client, target, expected, approved, beforeUsers, beforeProfiles, credentials } = input;
  assertExpectedTarget(target, expected);
  if (approved !== true) throw new Error("Se requiere autorización explícita");
  const projected = projectedDataset(input);
  for (const item of credentials)
    if (!await bcrypt.compare(item.password, item.hash)) throw new Error("La clave no corresponde a su hash");
  const db = client.db(target.database), session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const users = db.collection("empleados"), profiles = db.collection("perfiles_empleados");
      const read = (collection) => collection.find({}, { session }).sort({ _id: 1 }).toArray();
      if (!isDeepStrictEqual(await read(users), beforeUsers) ||
          !isDeepStrictEqual(await read(profiles), beforeProfiles)) throw new Error("Datos concurrentes; se cancela");
      for (const item of projected.plan.accounts) {
        const updated = projected.users.find((user) => String(user._id) === String(item.user._id));
        const write = await users.updateOne({ _id: item.user._id, email: item.user.email,
          sessionVersion: item.user.sessionVersion === undefined ? { $exists: false } : item.user.sessionVersion }, { $set: { email: updated.email, password: updated.password,
          active: true, sessionVersion: updated.sessionVersion } }, { session, upsert: false });
        if (write.modifiedCount !== 1) throw new Error("Conflicto de cuenta");
      }
      for (const profile of beforeProfiles) {
        const updated = projected.profiles.find((item) => String(item._id) === String(profile._id));
        const write = await profiles.updateOne({ _id: profile._id, user: profile.user, document: profile.document },
          { $set: { document: updated.document, status: updated.status } }, { session, upsert: false });
        if (write.modifiedCount !== 1) throw new Error("Conflicto de perfil");
      }
      if (!isDeepStrictEqual(await read(users), projected.users) ||
          !isDeepStrictEqual(await read(profiles), projected.profiles)) throw new Error("Cambios fuera del alcance; se revierte");
    }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
    return { accountsUpdated: 31, passwordsRotated: 31, accountsReactivated: projected.plan.accounts.filter((item) => !item.user.active).length,
      documentsUpdated: 152, preservedAccesses: 120, adminAccessUnchanged: true };
  } finally { await session.endSession(); }
}

module.exports = { completionPlan, variedDocuments, projectedDataset, completeEmployeeDataset };
