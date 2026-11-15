const { isDeepStrictEqual } = require("node:util");
const bcrypt = require("bcryptjs");
const { COLLECTION, assertExpectedTarget } = require("./password-rotation");
const PROTECTED = ["admin@sesha.com", "carlos.mendoza@sesha.com", "laura.gomez@sesha.com"];

async function quarantineAdditionalAccounts({ client, target, expected, manifest, publishedPasswords, apply = false, approved = false }) {
  assertExpectedTarget(target, expected);
  assertExpectedTarget(manifest?.target || {}, expected);
  const accounts = manifest?.accounts;
  if (!Array.isArray(accounts) || accounts.length !== 19 || new Set(accounts.map((user) => user.id)).size !== 19 ||
      new Set(accounts.map((user) => user.email)).size !== 19 || accounts.some((user) =>
        !/^[a-f0-9]{24}$/i.test(user.id) || user.role !== "employee" || typeof user.email !== "string" || PROTECTED.includes(user.email)))
    throw new Error("El manifiesto no coincide con el alcance autorizado");
  if (apply && (approved !== true || !Array.isArray(publishedPasswords) || !publishedPasswords.length))
    throw new Error("Falta autorización o referencia histórica");
  const session = client.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const collection = client.db(target.database).collection(COLLECTION);
      const before = await collection.find({}, { session }).sort({ _id: 1 }).toArray();
      const selected = accounts.map((entry) => {
        const matches = before.filter((user) => String(user._id) === entry.id && user.email === entry.email && user.role === "employee");
        if (matches.length !== 1) throw new Error("Una cuenta cambió; se cancela el alcance completo");
        return matches[0];
      });
      const active = selected.filter((user) => user.active !== false);
      if (apply) {
        for (const user of active) {
          let exposed = false;
          for (const value of publishedPasswords) {
            if (typeof user.password === "string" && await bcrypt.compare(value, user.password)) { exposed = true; break; }
          }
          if (!exposed || (user.sessionVersion !== undefined && (!Number.isSafeInteger(user.sessionVersion) || user.sessionVersion < 0)))
            throw new Error("Una credencial cambió; revisar de nuevo antes de aplicar");
        }
        for (const user of active) {
          const write = await collection.updateOne({ _id: user._id, email: user.email, role: "employee", password: user.password },
            { $set: { active: false }, $inc: { sessionVersion: 1 } }, { session, upsert: false });
          if (write.modifiedCount !== 1) throw new Error("Conflicto de actualización");
        }
        const after = await collection.find({}, { session }).sort({ _id: 1 }).toArray();
        const ids = new Set(active.map((user) => String(user._id)));
        if (!isDeepStrictEqual(after, before.map((user) => ids.has(String(user._id))
          ? { ...user, active: false, sessionVersion: (user.sessionVersion || 0) + 1 } : user)))
          throw new Error("Cambios fuera del alcance; se revierte la transacción");
      }
      result = { mode: apply ? "applied" : "read-only", ...target, matched: selected.length,
        disabled: apply ? active.length : 0, activeRemaining: apply ? 0 : active.length,
        passwordsChanged: false, rolesAndProfilesChanged: false, otherAccountsUnchanged: true };
    }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
    return result;
  } finally { await session.endSession(); }
}
module.exports = { quarantineAdditionalAccounts };
