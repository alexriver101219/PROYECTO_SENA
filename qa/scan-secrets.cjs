// Escaneo local sin comprobar credenciales contra proveedores ni registrar sus valores.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const output = path.resolve(root, process.env.SECRET_AUDIT_OUTPUT || ".qa/audit-2026-11-14");
if (!output.startsWith(root + path.sep)) throw new Error("La salida debe estar dentro del proyecto");
fs.mkdirSync(output, { recursive: true });
const binary = process.env.GITLEAKS_PATH || path.join(root, ".qa/tools/gitleaks/gitleaks.exe");
if (!fs.existsSync(binary)) throw new Error("Configura GITLEAKS_PATH con el escáner local");
const source = fs.mkdtempSync(path.join(output, "source-"));
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8" })
  .split("\0").filter(Boolean);
const binaryExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".ico", ".mp4", ".woff", ".woff2", ".ttf", ".exe"]);
let textFiles = 0, binaryFiles = 0;
const pdfs = [];
for (const file of files) {
  const original = path.resolve(root, file);
  if (!original.startsWith(root + path.sep) || !fs.existsSync(original)) continue;
  if (!fs.lstatSync(original).isFile()) continue;
  const extension = path.extname(file).toLowerCase();
  if (extension === ".pdf") { pdfs.push(file); continue; }
  if (binaryExtensions.has(extension)) { binaryFiles++; continue; }
  const destination = path.resolve(source, file);
  if (!destination.startsWith(source + path.sep)) throw new Error("Ruta de archivo inválida");
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(original, destination);
  textFiles++;
}
let pdfFailures = 0;
if (pdfs.length) {
  const python = process.env.AUDIT_PYTHON || path.join(root, ".qa/pdf-venv/Scripts/python.exe");
  const program = [
    "import json,sys", "from pathlib import Path", "from pypdf import PdfReader",
    "data=json.load(sys.stdin)", "failed=[]", "count=0", "for name in data['files']:",
    " try:", "  reader=PdfReader(Path(data['root'])/name)",
    "  target=Path(data['source'])/(name+'.extracted.txt')", "  target.parent.mkdir(parents=True,exist_ok=True)",
    "  target.write_text('\\n'.join(page.extract_text() or '' for page in reader.pages),encoding='utf-8')", "  count+=1",
    " except Exception:", "  failed.append(name)", "print(json.dumps({'extracted':count,'failed':failed}))",
  ].join("\n");
  const result = spawnSync(python, ["-c", program], { cwd: root, input: JSON.stringify({ files: pdfs, root, source }), encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error("No se pudo extraer el texto de los PDF; detalles privados omitidos");
  pdfFailures = JSON.parse(result.stdout).failed.length;
}

// La plantilla excluye explícitamente Secret, Match, Line, autores y mensajes de commits.
const templatePath = path.join(output, "metadata-only.tmpl");
fs.writeFileSync(templatePath, '[{{range $i, $f := .}}{{if $i}},{{end}}{"file":{{printf "%q" $f.File}},"line":{{$f.StartLine}},"rule":{{printf "%q" $f.RuleID}},"commit":{{printf "%q" $f.Commit}},"fingerprint":{{printf "%q" $f.Fingerprint}}}{{end}}]');
function scan(kind, target, extra = []) {
  const report = path.join(output, `secrets-${kind}.json`);
  const args = [kind === "history" ? "git" : "dir", target, "--no-banner", "--log-level", "fatal", "--redact=100",
    "--config", path.join(root, "qa/gitleaks.toml"), "--report-format", "template", "--report-template", templatePath,
    "--report-path", report, "--max-decode-depth", "2", ...extra];
  const result = spawnSync(binary, args, { cwd: root, encoding: "utf8", windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  const findings = fs.existsSync(report) ? JSON.parse(fs.readFileSync(report, "utf8")) : [];
  if (![0, 1].includes(result.status) || (result.status === 1 && !findings.length))
    throw new Error(`El escáner ${kind} no finalizó correctamente; detalles privados omitidos`);
  for (const finding of findings) {
    if (kind === "current" && path.isAbsolute(finding.file)) finding.file = path.relative(source, finding.file).replaceAll("\\", "/");
    if (Object.keys(finding).some((key) => !["file", "line", "rule", "commit", "fingerprint"].includes(key)))
      throw new Error("El informe contiene campos fuera de la lista permitida");
  }
  fs.writeFileSync(report, JSON.stringify(findings, null, 2));
  return findings;
}
const current = scan("current", source);
const reuseHistory = process.argv.includes("--current-only");
const historyReport = path.join(output, "secrets-history.json");
if (reuseHistory && !fs.existsSync(historyReport)) throw new Error("Falta un informe previo del historial");
const history = reuseHistory ? JSON.parse(fs.readFileSync(historyReport, "utf8")) : scan("history", root, ["--log-opts=--all --no-ext-diff --no-textconv"]);
const buildPath = path.join(root, "Style/login_app/dist");
const build = fs.existsSync(buildPath) ? scan("build", buildPath) : [];
// Comprobación específica: los tres informes históricos imprimen la huella del
// código, también publicada en su JSON de evidencia; esa huella no es una clave.
const baseline = JSON.parse(fs.readFileSync(path.join(root, "docs/pruebas/2026-11-13/resultados.json"), "utf8"));
const checksum = baseline.source.applicationSha256;
const reviewed = [];
for (const finding of current) {
  if (finding.rule !== "generic-api-key" || !finding.file.endsWith(".pdf.extracted.txt")) continue;
  const lines = fs.readFileSync(path.join(source, finding.file), "utf8").split("\n");
  const context = lines.slice(Math.max(0, finding.line - 3), finding.line + 3).join("\n");
  // El generador separa deliberadamente el SHA-256 en dos líneas de 32 caracteres.
  if (/^[a-f0-9]{64}$/i.test(checksum) && context.replace(/\s/g, "").includes(checksum) && context.includes("Huella SHA-256") &&
      context.includes("código de aplicación, sin secretos ni informes"))
    reviewed.push({ ...finding, classification: "non-secret-source-checksum", evidence: "docs/pruebas/2026-11-13/resultados.json#source.applicationSha256" });
}
fs.writeFileSync(path.join(output, "secrets-reviewed-non-secrets.json"), JSON.stringify(reviewed, null, 2));
const summary = {
  scanner: execFileSync(binary, ["version"], { encoding: "utf8", windowsHide: true }).trim(),
  scope: "Archivos versionados y nuevos no ignorados; todas las referencias locales de Git",
  textFiles, pdfTextFiles: pdfs.length, pdfExtractionFailures: pdfFailures, binaryFilesNotOcrScanned: binaryFiles,
  commits: Number(execFileSync("git", ["rev-list", "--all", "--count"], { cwd: root, encoding: "utf8" }).trim()),
  currentFindings: current.length, historyFindings: history.length, buildFindings: build.length,
  historyReusedFromPreviousFullScan: reuseHistory,
  currentReviewedNonSecrets: reviewed.length, currentUnresolvedFindings: current.length - reviewed.length,
  buildScanned: fs.existsSync(buildPath),
  currentRules: [...new Set(current.map((finding) => finding.rule))],
  historyRules: [...new Set(history.map((finding) => finding.rule))],
  credentialValuesRecorded: false, onlineValidityChecks: false,
};
fs.writeFileSync(path.join(output, "secrets-summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary));
const safeSource = fs.realpathSync(source);
const safeOutput = fs.realpathSync(output);
if (!safeSource.startsWith(safeOutput + path.sep) || !path.basename(safeSource).startsWith("source-"))
  throw new Error("No se puede retirar el directorio temporal fuera de su alcance");
fs.rmSync(safeSource, { recursive: true });
if (current.length !== reviewed.length || build.length || pdfFailures || !fs.existsSync(buildPath)) process.exitCode = 1;
