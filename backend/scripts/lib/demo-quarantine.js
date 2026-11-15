const { COLLECTION, assertExpectedTarget } = require("./password-rotation");
const { isDeepStrictEqual } = require("node:util");

const DEMO_EMAILS = Object.freeze(Array.from({ length: 120 }, (_, index) =>
  `demo.exposicion.${String(index + 1).padStart(3, "0")}@sesha.com`));

async function quarantineDemoAccounts({ client, target, expected, approved = false, apply = false }) {
  assertExpectedTarget(target, expected);
  if (apply && approved !== true) throw new Error("Falta autorización específica");
  const db = client.db(target.database);
  const session = client.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const users = db.collection(COLLECTION);
      const before = await users.find({}, { session }).sort({ _id: 1 }).toArray();
      const demos = before.filter((user) => DEMO_EMAILS.includes(user.email));
      if (demos.length !== DEMO_EMAILS.length || DEMO_EMAILS.some((email) =>
        demos.filter((user) => user.email === email).length !== 1) ||
        demos.some((user) => user.role !== "employee" || typeof user.active !== "boolean" ||
          (user.sessionVersion !== undefined && (!Number.isSafeInteger(user.sessionVersion) || user.sessionVersion < 0))))
        throw new Error("El alcance demo no coincide; no se aplican cambios");
      const active = demos.filter((user) => user.active);
      if (apply) {
        for (const user of active) {
          const write = await users.updateOne({ _id: user._id, email: user.email, active: true },
            { $set: { active: false }, $inc: { sessionVersion: 1 } }, { session, upsert: false });
          if (write.modifiedCount !== 1) throw new Error("Conflicto de actualización");
        }
        const after = await users.find({}, { session }).sort({ _id: 1 }).toArray();
        const expectedUsers = before.map((user) => DEMO_EMAILS.includes(user.email) && user.active
          ? { ...user, active: false, sessionVersion: (user.sessionVersion || 0) + 1 } : user);
        if (!isDeepStrictEqual(after, expectedUsers)) throw new Error("Cambios fuera del alcance; se revierte");
      }
      result = { mode: apply ? "applied" : "read-only", ...target, matched: demos.length,
        disabled: apply ? active.length : 0, activeRemaining: apply ? 0 : active.length,
        accountsPreserved: true, passwordsChanged: false, rolesAndProfilesChanged: false,
        otherAccountsUnchanged: true };
    }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
    return result;
  } finally { await session.endSession(); }
}

module.exports = { DEMO_EMAILS, quarantineDemoAccounts };
