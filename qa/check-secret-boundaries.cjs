// Compara valores privados en memoria; nunca imprime ni guarda esos valores.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const dotenv = require("dotenv");
const root = path.resolve(__dirname, "..");
const output = path.join(root, ".qa/audit-2026-11-14");
fs.mkdirSync(output, { recursive: true });
const values = [];
function add(label, value) {
  if (typeof value === "string" && value.length >= 8 && !values.some((entry) => entry.value === value)) values.push({ label, value });
}
for (const file of ["backend/.env", ".env.local", ".env"]) {
  if (!fs.existsSync(path.join(root, file))) continue;
  const env = dotenv.parse(fs.readFileSync(path.join(root, file)));
  for (const key of ["MONGO_URI", "JWT_SECRET", "VERCEL_OIDC_TOKEN"]) add(key, env[key]);
  if (env.MONGO_URI) {
    try { add("MONGODB_DATABASE_PASSWORD", decodeURIComponent(new URL(env.MONGO_URI).password)); }
    catch { throw new Error("No se pudo interpretar la conexión privada; detalles omitidos"); }
  }
}
const currentFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
const buildFiles = [];
function walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const name of fs.readdirSync(directory)) {
    const file = path.join(directory, name);
    const stat = fs.lstatSync(file);
    if (stat.isDirectory()) walk(file);
    else if (stat.isFile() && /\.(?:js|css|html|json|map)$/i.test(file)) buildFiles.push(path.relative(root, file));
  }
}
walk(path.join(root, "Style/login_app/dist"));
const matches = [];
const skipped = /\.(?:png|jpe?g|gif|ico|mp4|ttf|woff2?|pdf)$/i;
for (const [scope, files] of [["current-source", currentFiles], ["compiled-frontend", buildFiles]]) {
  for (const file of files) {
    if (skipped.test(file) || !fs.existsSync(path.join(root, file)) || !fs.lstatSync(path.join(root, file)).isFile()) continue;
    const text = fs.readFileSync(path.join(root, file), "utf8");
    for (const entry of values) if (text.includes(entry.value)) matches.push({ scope, file, variable: entry.label });
  }
}
const historyMatches = [];
const patch = execFileSync("git", ["log", "--all", "-p", "--no-ext-diff", "--no-textconv", "--format=COMMIT:%H", "--unified=0", "--no-color"], {
  cwd: root, encoding: "utf8", maxBuffer: 128 * 1024 * 1024,
});
let commit = "", file = "";
for (const line of patch.split("\n")) {
  if (line.startsWith("COMMIT:")) commit = line.slice(7).trim();
  else if (line.startsWith("diff --git ")) file = line.split(" b/").slice(1).join(" b/").replace(/^"|"$/g, "");
  else if (line.startsWith("+") || line.startsWith("-")) {
    for (const entry of values)
      if (line.includes(entry.value) && !historyMatches.some((match) => match.commit === commit && match.file === file && match.variable === entry.label))
        historyMatches.push({ commit, file, variable: entry.label });
  }
}
const pdfs = currentFiles.filter((file) => file.endsWith(".pdf"));
const python = process.env.AUDIT_PYTHON || path.join(root, ".qa/pdf-venv/Scripts/python.exe");
const program = ["import json,sys", "from pathlib import Path", "from pypdf import PdfReader", "d=json.load(sys.stdin)", "hits=[]", "for name in d['files']:",
  " text='\\n'.join(p.extract_text() or '' for p in PdfReader(Path(d['root'])/name).pages)", " for item in d['values']:",
  "  if item['value'] in text: hits.append({'scope':'pdf-text','file':name,'variable':item['label']})", "print(json.dumps(hits))"].join("\n");
const result = spawnSync(python, ["-c", program], { input: JSON.stringify({ files: pdfs, root, values }), encoding: "utf8", windowsHide: true });
if (result.status !== 0) throw new Error("No se pudo comprobar el texto PDF; detalles omitidos");
matches.push(...JSON.parse(result.stdout));
const ignored = [".env", "backend/.env", ".env.local"].map((file) => ({ file, ignored: spawnSync("git", ["check-ignore", "-q", file], { cwd: root, windowsHide: true }).status === 0 }));
const privateEnvTracked = currentFiles.filter((file) => /(^|\/)\.env(?:$|\.)/.test(file) && !/(^|\/)\.env(?:\.[^/]+)?\.example$/.test(file) && !file.endsWith("/.env.example") && file !== ".env.example");
const report = { checkedConfiguredSecretTypes: values.map((entry) => entry.label), currentMatches: matches, historyMatches,
  ignored, privateEnvTracked, compiledFilesChecked: buildFiles.length, pdfFilesChecked: pdfs.length,
  secretValuesRecorded: false, providerValidityChecks: false };
fs.writeFileSync(path.join(output, "secret-boundaries.json"), JSON.stringify(report, null, 2));
values.fill(null);
console.log(JSON.stringify(report));
if (matches.length || historyMatches.length || privateEnvTracked.length || ignored.some((entry) => !entry.ignored)) process.exitCode = 1;
