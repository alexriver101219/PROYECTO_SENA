const fs = require("node:fs"), path = require("node:path"), { execFileSync } = require("node:child_process");
const { createMaintenanceClient } = require("./lib/password-rotation");
const { quarantineAdditionalAccounts } = require("./lib/additional-quarantine");
const root = path.resolve(__dirname, "../..");
async function main(args = process.argv.slice(2)) {
  if (args.some((arg) => !["--apply", "--approved-disable-additional"].includes(arg))) throw new Error("Argumentos inválidos");
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".qa/remediation-2026-11-14/additional-exposed-accounts.json"), "utf8"));
  const findings = JSON.parse(fs.readFileSync(path.join(root, ".qa/audit-2026-11-14/secrets-history.json"), "utf8"));
  const reference = findings.find((entry) => entry.file === "backend/scripts/seed.js" && entry.rule === "sesha-hardcoded-password")?.commit;
  if (!/^[a-f0-9]{40}$/i.test(reference)) throw new Error("Referencia histórica inesperada");
  const seed = execFileSync("git", ["show", `${reference}:backend/scripts/seed.js`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const publishedPasswords = [...new Set([...seed.matchAll(/password:\s*["']([^"']+)["']/g)].map((match) => match[1]))];
  if (publishedPasswords.length !== 2) throw new Error("Referencias históricas inesperadas");
  const { client, target } = createMaintenanceClient(process.env.MONGO_URI);
  try {
    await client.connect();
    const result = await quarantineAdditionalAccounts({ client, target, manifest, publishedPasswords,
      expected: { host: "cluster1.nopuzfk.mongodb.net", database: "proyecto_sena" },
      apply: args.includes("--apply"), approved: args.includes("--approved-disable-additional") });
    if (args.includes("--apply")) fs.writeFileSync(path.join(root, ".qa/remediation-2026-11-14/additional-quarantine.json"), JSON.stringify(result, null, 2));
    return result;
  } finally { publishedPasswords.fill(""); await client.close(); }
}
if (require.main === module) {
  require("dotenv").config({ quiet: true, path: path.join(root, "backend/.env") });
  main().then((result) => console.log(JSON.stringify(result))).catch(() => {
    console.error("Cuarentena adicional no completada; detalles privados omitidos. Verificar estado antes de reintentar.");
    process.exitCode = 1;
  });
}
module.exports = { main };
