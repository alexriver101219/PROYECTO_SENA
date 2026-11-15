// Exportación por lista de campos: nunca copia sesiones, cuerpos ni evidencias crudas.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const localOnly = process.argv.includes("--local-only");
const date = process.env.REPORT_DATE || "2026-11-14";
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Fecha inválida");
const input = path.resolve(root, process.env.QA_OUTPUT || `.qa/reports-${date}`);
const remote = path.resolve(root, process.env.ZAP_VERCEL_OUTPUT || `.qa/zap-vercel-${date}`);
const target = path.join(root, "docs/pruebas", date);
for (const directory of [input, remote]) if (!directory.startsWith(path.join(root, ".qa") + path.sep)) throw new Error("Entrada fuera del directorio privado");
const read = (directory, name) => JSON.parse(fs.readFileSync(path.join(directory, name), "utf8").replace(/^\uFEFF/, ""));
const strip = (value) => String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const artifactHash = crypto.createHash("sha256");
const sources = ["api", "backend/app.js", "backend/server.js", "backend/config", "backend/models", "backend/middlewares", "backend/routes", "backend/services", "backend/utils", "backend/assets", "Style/login_app/src", "Style/login_app/index.html", "Style/login_app/vite.config.js", "package.json", "package-lock.json", "backend/package.json", "Style/login_app/package.json", "vercel.json"];
function fingerprint(relative) {
  const file = path.join(root, relative);
  if (fs.statSync(file).isDirectory()) for (const item of fs.readdirSync(file).sort()) fingerprint(path.join(relative, item));
  else { artifactHash.update(relative.replaceAll("\\", "/")); artifactHash.update(fs.readFileSync(file)); }
}
sources.forEach(fingerprint);
const source = { commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  applicationSha256: artifactHash.digest("hex"), note: "Huella de aplicación; cambios de esta entrega limitados a QA e informes. Los resultados de Vitest se conservan de la misma versión del código; HTTP, k6 y ZAP se repiten en esta campaña." };
const tests = [], functional = {};
for (const [suite, file] of [["Backend", "backend-vitest.json"], ["Frontend", "frontend-vitest.json"]]) {
  const data = read(input, file);
  functional[suite.toLowerCase()] = { total: data.numTotalTests, passed: data.numPassedTests, failed: data.numFailedTests,
    executedAt: new Date(data.startTime).toISOString(), reusedVerifiedEvidence: true };
  for (const group of data.testResults) for (const item of group.assertionResults)
    tests.push({ suite, name: item.title, status: item.status, durationMs: item.duration || 0 });
}
const http = read(input, "functional-http.json");
functional.http = { total: http.tests.length, passed: http.passed, failed: http.failed, executedAt: http.timestamp };
tests.push(...http.tests.map((item) => ({ suite: "HTTP", name: item.name, status: item.status, durationMs: item.durationMs })));
Object.assign(functional, { total: tests.length, passed: tests.filter((item) => item.status === "passed").length,
  failed: tests.filter((item) => item.status === "failed").length, tests });
if (functional.passed !== functional.total) throw new Error("No publicar la campaña funcional como aprobada");
const production = read(path.join(root, ".qa/remediation-2026-11-14"), "production-verification.json");
functional.production = { target: production.target, executedAt: production.timestamp, passed: production.passed, failed: production.failed,
  checks: production.checks.map(({ name, passed }) => ({ name, passed })), ownerPasswordsUsed: false, businessWritesPerformed: false };
function aggregate(native, isRemote) {
  const unique = new Map();
  for (const site of native.site || []) for (const item of site.alerts || []) {
    const key = `${item.alertRef || item.pluginid}:${item.name || item.alert}`;
    if (!unique.has(key)) unique.set(key, { id: String(item.pluginid), reference: item.alertRef || String(item.pluginid), name: item.name || item.alert,
      riskCode: Number(item.riskcode), confidence: item.confidence, cwe: item.cweid, count: 0, paths: [],
      description: strip(item.desc).slice(0, 650), solution: strip(item.solution).slice(0, 650) });
    const alert = unique.get(key);
    alert.count += item.instances?.length || Number(item.count) || 0;
    for (const instance of item.instances || []) {
      const uri = new URL(instance.uri);
      if (isRemote ? uri.origin !== "https://sesha-app.vercel.app" : !["127.0.0.1", "localhost"].includes(uri.hostname)) throw new Error("Alerta fuera de alcance");
      const route = uri.pathname.replace(/[a-f0-9]{24}/gi, "{id}");
      if (!alert.paths.includes(route)) alert.paths.push(route);
    }
    if (alert.id === "10098") alert.review = "Se conserva la clasificación automática. Contrastar CORS de recursos públicos con el rechazo de orígenes ajenos en API autenticada; no equivale por sí solo a una fuga de datos privados.";
    else if (alert.id === "10055") alert.review = "La regla señala una política CSP que requiere revisión. El texto y la clasificación corresponden a esta ejecución; no se trasladan automáticamente resultados anteriores.";
    else if (alert.id === "10027") alert.review = "La detección de comentarios es informativa y no demuestra por sí sola una contraseña o dato privado expuesto. No se publica la evidencia cruda.";
    else if (["10015", "10050"].includes(alert.id)) alert.review = "Interpretar junto con las cabeceras no-store, el contraste de dos cuentas y el rechazo del acceso anónimo. Una cabecera de caché por sí sola no demuestra mezcla de datos.";
    else alert.review = alert.riskCode === 0 ? "Observación informativa; no demuestra una vulnerabilidad explotable." : "Hallazgo automático conservado; revisar su evidencia privada antes de afirmar una explotación.";
  }
  const alerts = [...unique.values()].sort((a, b) => b.riskCode - a.riskCode || a.id.localeCompare(b.id));
  const riskCounts = { high: 0, medium: 0, low: 0, informational: 0 };
  for (const alert of alerts) {
    if (![0, 1, 2, 3].includes(alert.riskCode)) throw new Error("Clasificación inesperada");
    riskCounts[["informational", "low", "medium", "high"][alert.riskCode]]++;
  }
  return { riskCounts, alerts };
}
const runs = read(input, "k6-results.json").runs;
const best = (items) => items.sort((a, b) => b.targetRps - a.targetRps)[0] || null;
const localRun = read(input, "zap-run.json");
if (localRun.code !== 0) throw new Error("Escaneo local incompleto");
const remoteRun = localOnly ? {} : read(remote, "run.json");
if (!localOnly && (remoteRun.code !== 0 || remoteRun.stoppedForHealth)) throw new Error("Escaneo Vercel incompleto");
const homes = localOnly ? [] : fs.readdirSync(remote, { withFileTypes: true }).filter((item) => item.isDirectory() && item.name.startsWith("zap-home-"))
  .map((item) => path.join(remote, item.name)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
const nativeLog = localOnly ? "" : fs.readFileSync(path.join(homes[0], "zap.log"), "utf8");
const activeEvidence = [...nativeLog.matchAll(/completed host\/plugin https:\/\/sesha-app\.vercel\.app \| (\w+) in ([\d.]+)s with (\d+) message\(s\) sent and (\d+) alert\(s\) raised/g)]
  .map((match) => ({ rule: match[1], seconds: Number(match[2]), requests: Number(match[3]), alerts: Number(match[4]) }));
if (!localOnly && activeEvidence.length !== 2) throw new Error("No finalizaron ambas reglas activas de Vercel");
const dependencies = read(input, "dependencies.json");
const summary = { project: "SESHA APP - Proyecto SENA", date, timezone: "America/Bogota", generatedAt: new Date().toISOString(), source,
  environment: read(input, "environment.json"), functional, protection: read(input, "protection-limits.json"),
  performance: { version: execFileSync(process.env.K6_BINARY || "C:/Program Files/k6/k6.exe", ["version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(),
    runs, sustained: best(runs.filter((item) => item.kind === "mixed" && item.duration === "60s" && item.passed)),
    shortPeak: best(runs.filter((item) => item.kind === "mixed" && item.duration === "25s" && item.passed)),
    loginPassed: best(runs.filter((item) => item.kind === "login" && item.passed)),
    criteria: { mixedP95Ms: 500, certificateP95Ms: 1500, loginP95Ms: 1000, errorRateLessThan: 0.01, droppedIterations: 0 },
    note: "Carga exclusivamente local; generador, API y MongoDB comparten equipo. No mide capacidad de Vercel/Atlas ni usuarios simultáneos." },
  security: { ...localRun, ...aggregate(read(input, "zap-native.json"), false),
    productionHeaders: read(input, "production-headers.json"), npmAudit: dependencies.vulnerabilities },
  historicalEvidence: "../2026-11-13/resultados.json" };
const remoteSummary = localOnly ? null : { project: summary.project, date, timezone: summary.timezone, target: remoteRun.target,
  deployment: read(remote, "deployment.json"), start: remoteRun.start, end: remoteRun.end,
  zapVersion: remoteRun.zapVersion, addOns: remoteRun.addOns,
  execution: { code: remoteRun.code, stoppedForHealth: remoteRun.stoppedForHealth, passiveRoutes: remoteRun.passiveRoutes,
    activeRoute: remoteRun.activeRoute, parameters: remoteRun.parameters, activeRules: remoteRun.activeRules, activeEvidence,
    activeMinutesLimit: remoteRun.activeMinutesLimit, threads: remoteRun.threads, delayMs: remoteRun.delayMs, authentication: "Sesiones privadas iniciadas por el propietario; sin contraseñas en scripts o informes" },
  checks: { before: remoteRun.before, after: remoteRun.after, countersUnchanged: remoteRun.countersUnchanged,
    readyStatus: remoteRun.readyStatus, anonymousDashboardStatus: remoteRun.anonymousDashboardStatus },
  ...aggregate(read(remote, "zap-vercel-native.json"), true), manualReview: read(remote, "review.json"),
  limitations: "Solo rutas conocidas y dos reglas de bajo impacto sobre paginación GET. Sin spider, DOM/AJAX, formularios, cargas, fuerza bruta, escrituras de negocio o pruebas de carga en Vercel. No es un pentest exhaustivo.",
  historicalEvidence: "../2026-11-13/zap-vercel-resultados.json" };
fs.mkdirSync(target, { recursive: true });
for (const [name, data] of [["resultados.json", summary], ...(remoteSummary ? [["zap-vercel-resultados.json", remoteSummary]] : [])]) {
  const text = JSON.stringify(data, null, 2);
  if (/mongodb\+srv:\/\/|sesha_session=|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|gh[pousr]_[A-Za-z0-9]{20}/.test(text)) throw new Error("Posible secreto; no se publica");
  fs.writeFileSync(path.join(target, name), text);
}
console.log(JSON.stringify({ exported: target, functional: functional.passed, sustainedRps: summary.performance.sustained?.targetRps,
  localRisks: summary.security.riskCounts, vercelRisks: remoteSummary?.riskCounts || null }));
