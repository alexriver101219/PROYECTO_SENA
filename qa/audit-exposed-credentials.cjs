// Solo lectura en el destino aprobado. No ejecuta login ni guarda claves o hashes.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const { createMaintenanceClient, assertExpectedTarget } = require("../backend/scripts/lib/password-rotation");
const root = path.resolve(__dirname, "..");
async function main() {
  if (process.argv[2] !== "--atlas-read-only" || process.argv.length !== 3) throw new Error("Modo de auditoría explícito requerido");
  const env = dotenv.parse(fs.readFileSync(path.join(root, "backend/.env")));
  const { client, target } = createMaintenanceClient(env.MONGO_URI);
  assertExpectedTarget(target, { host: "cluster1.nopuzfk.mongodb.net", database: "proyecto_sena" });
  const historyReport = JSON.parse(fs.readFileSync(path.join(root, ".qa/audit-2026-11-14/secrets-history.json"), "utf8"));
  const reference = process.env.EXPOSED_CREDENTIALS_REF || historyReport.find((entry) => entry.file === "backend/scripts/seed.js" && entry.rule === "sesha-hardcoded-password")?.commit;
  if (!/^[a-f0-9]{40}$/i.test(reference)) throw new Error("Referencia histórica inválida");
  const seed = execFileSync("git", ["show", `${reference}:backend/scripts/seed.js`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const demo = execFileSync("git", ["show", `${reference}:backend/scripts/add-demo-employees.js`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const historical = [...seed.matchAll(/email:\s*["']([^"']+)["'][\s\S]*?password:\s*["']([^"']+)["']/g)]
    .filter((match) => ["admin@sesha.com", "carlos.mendoza@sesha.com", "laura.gomez@sesha.com"].includes(match[1]))
    .map((match) => ({ email: match[1], value: match[2] }));
  const demoMatch = demo.match(/const PASSWORD = ["']([^"']+)["']/);
  if (historical.length !== 3 || !demoMatch) throw new Error("No se identificaron las referencias históricas esperadas");
  const demoEmails = Array.from({ length: 120 }, (_, i) => `demo.exposicion.${String(i + 1).padStart(3, "0")}@sesha.com`);
  const report = { mode: "read-only", target, historicalReference: reference, rotatedAccounts: [], demoAccountsFound: 0, activeDemoAccounts: 0,
    activeDemoAccountsMatchingExposedPassword: 0, inactiveDemoAccountsMatchingExposedPassword: 0,
    passwordValuesOrHashesRecorded: false, loginRequestsSent: false, writesPerformed: false };
  try {
    await client.connect();
    const collection = client.db(target.database).collection("empleados");
    const users = await collection.find({ email: { $in: [...demoEmails, ...historical.map((entry) => entry.email)] } },
      { projection: { _id: 0, email: 1, password: 1, active: 1 } }).toArray();
    for (const entry of historical) {
      const matches = users.filter((user) => user.email === entry.email);
      report.rotatedAccounts.push({ email: entry.email, uniqueAccount: matches.length === 1,
        historicalPasswordStillMatches: matches.length === 1 && typeof matches[0].password === "string" && await bcrypt.compare(entry.value, matches[0].password) });
    }
    for (const user of users.filter((entry) => demoEmails.includes(entry.email))) {
      report.demoAccountsFound++;
      if (user.active === true) report.activeDemoAccounts++;
      const matches = typeof user.password === "string" && await bcrypt.compare(demoMatch[1], user.password);
      if (matches && user.active === true) report.activeDemoAccountsMatchingExposedPassword++;
      else if (matches) report.inactiveDemoAccountsMatchingExposedPassword++;
      user.password = "";
    }
    const output = path.join(root, ".qa/audit-2026-11-14/credential-revocation.json");
    fs.writeFileSync(output, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    if (report.activeDemoAccountsMatchingExposedPassword || report.rotatedAccounts.some((entry) => entry.historicalPasswordStillMatches || !entry.uniqueAccount)) process.exitCode = 1;
  } finally {
    historical.forEach((entry) => { entry.value = ""; });
    await client.close();
  }
}
main().catch(() => { console.error("Auditoría de lectura incompleta; detalles privados omitidos"); process.exitCode = 2; });
