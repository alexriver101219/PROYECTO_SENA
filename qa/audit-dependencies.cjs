// Conserva solo datos públicos de vulnerabilidades; omite salida cruda de npm.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const output = path.resolve(root, process.env.SECRET_AUDIT_OUTPUT || ".qa/audit-2026-11-14");
if (!output.startsWith(root + path.sep)) throw new Error("Ruta de salida inválida");
const npm = path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
const result = spawnSync(process.execPath, [npm, "audit", "--json", "--audit-level=moderate"], {
  cwd: root, encoding: "utf8", windowsHide: true, maxBuffer: 8 * 1024 * 1024,
});
let audit;
try { audit = JSON.parse(result.stdout); } catch { /* Se informa sin salida cruda. */ }
if (!audit?.metadata?.vulnerabilities) {
  console.error("No se pudo completar npm audit; detalles privados omitidos");
  process.exitCode = 2;
} else {
  const summary = { node: process.version, completed: true, vulnerabilities: audit.metadata.vulnerabilities,
    dependencies: audit.metadata.dependencies,
    advisories: Object.values(audit.vulnerabilities || {}).map((entry) => ({
      name: entry.name, severity: entry.severity, isDirect: entry.isDirect, range: entry.range,
      fixAvailable: entry.fixAvailable,
      via: entry.via.filter((value) => typeof value === "object").map(({ title, url, severity, range, cwe }) => ({ title, url, severity, range, cwe })),
    })),
  };
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, "dependencies.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
  process.exitCode = result.status || 0;
}
