const fs = require("node:fs");
const path = require("node:path");
function readSessions(root) {
  const file = path.resolve(root, process.env.QA_ZAP_SESSION_FILE || ".qa/zap-vercel-2026-11-14/sessions-private.json");
  if (!file.startsWith(path.join(root, ".qa") + path.sep)) throw new Error("Sesiones fuera del directorio privado");
  const record = JSON.parse(fs.readFileSync(file, "utf8"));
  const created = Date.parse(record.createdAt);
  if (record.target !== "https://sesha-app.vercel.app" || !Number.isFinite(created) || created > Date.now() + 60000 || Date.now() - created > 110 * 60000 ||
      !Array.isArray(record.sessions) || record.sessions.length !== 2) throw new Error("Sesiones ausentes o caducadas");
  for (const [email, role] of [["admin@sesha.com", "admin"], ["carlos.mendoza@sesha.com", "employee"]]) {
    const entries = record.sessions.filter((entry) => entry.email === email && entry.role === role);
    if (entries.length !== 1 || !/^sesha_session=[A-Za-z0-9_.%=-]+$/.test(entries[0].cookie) ||
        !/^[a-f0-9]{64}$/.test(entries[0].csrfToken)) throw new Error("Sesión privada no válida");
  }
  return record.sessions;
}
module.exports = { readSessions };
