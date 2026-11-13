const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const input = path.join(root, ".qa/assessment-2026-11-13");
const target = path.join(root, "docs/pruebas/2026-11-13");
fs.mkdirSync(target, { recursive: true });
const read = name => JSON.parse(fs.readFileSync(path.join(input, name)));
const tests = [];
const functional = {};
for (const [suite, name] of [["Backend", "backend-vitest.json"], ["Frontend", "frontend-vitest.json"]]) {
  const data = read(name);
  functional[suite.toLowerCase()] = { total: data.numTotalTests, passed: data.numPassedTests, failed: data.numFailedTests };
  for (const group of data.testResults) for (const test of group.assertionResults) tests.push({ suite, name: test.title, status: test.status, durationMs: test.duration || 0 });
}
const http = read("functional-http.json");
functional.http = { total: http.tests.length, passed: http.passed, failed: http.failed };
tests.push(...http.tests.map(test => ({ suite: "HTTP", name: test.name, status: test.status, durationMs: test.durationMs })));
functional.total = tests.length;
functional.passed = tests.filter(test => test.status === "passed").length;
functional.failed = functional.total - functional.passed;
functional.tests = tests;
const runs = read("k6-results.json").runs;
const mixed = runs.filter(run => run.kind === "mixed" && run.duration === "25s");
const sustained = runs.filter(run => run.kind === "mixed" && run.duration === "60s" && run.passed).sort((a, b) => b.targetRps - a.targetRps)[0];
const short = mixed.filter(run => run.passed).sort((a, b) => b.targetRps - a.targetRps)[0];
const shortFail = mixed.filter(run => !run.passed).sort((a, b) => a.targetRps - b.targetRps)[0];
const login = runs.filter(run => run.kind === "login" && run.passed).sort((a, b) => b.targetRps - a.targetRps)[0];
const loginFail = runs.filter(run => run.kind === "login" && !run.passed).sort((a, b) => a.targetRps - b.targetRps)[0];
const headers = read("production-headers.json");
const native = read("zap-native.json");
const unique = new Map();
const strip = value => String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
for (const site of native.site || []) for (const alert of site.alerts || []) {
  const key = (alert.alertRef || alert.pluginid) + ":" + (alert.name || alert.alert);
  let item = unique.get(key);
  if (!item) {
    item = { id: alert.pluginid, reference: alert.alertRef, name: alert.name || alert.alert,
      riskCode: Number(alert.riskcode), risk: alert.riskdesc, confidence: alert.confidence,
      cwe: alert.cweid, count: 0, paths: [], description: strip(alert.desc).slice(0, 900), solution: strip(alert.solution).slice(0, 900) };
    unique.set(key, item);
  }
  item.count += alert.instances?.length || Number(alert.count) || 0;
  for (const instance of alert.instances || []) {
    try { const route = new URL(instance.uri).pathname.replace(/[0-9a-f]{24}/gi, "{id}"); if (!item.paths.includes(route)) item.paths.push(route); } catch { /* No publicar URLs no reconocidas. */ }
  }
}
const productionPowered = headers.results.some(route => !!route.headers["x-powered-by"]);
for (const alert of unique.values()) {
  if (alert.id === "10055") { alert.review = "Confirmada como mejora de endurecimiento"; alert.reviewDetail = "La CSP pública conserva style-src 'unsafe-inline'. No se demostró explotación XSS. Evaluar estilos externos y retirar esta excepción mediante pruebas de interfaz."; }
  else if (alert.id === "10037") { alert.review = productionPowered ? "Cabecera pública presente; revisar valor" : "Limitada al arnés local"; alert.reviewDetail = productionPowered ? "Contrastar el valor del proveedor con la necesidad real de divulgar tecnología." : "El servidor estático auxiliar expresa X-Powered-By: Express. No se observó esa cabecera en las cuatro rutas públicas contrastadas; no se atribuye como vulnerabilidad de producción."; }
  else if (alert.id === "10027") { alert.review = "No se confirmó filtración"; alert.reviewDetail = "La evidencia marcada fue la palabra 'select' en JavaScript compilado. Por sí sola no demuestra exposición de secretos ni datos privados."; }
  else { alert.review = "Informativa"; alert.reviewDetail = "Describe características o comportamiento observado por el escáner; no demuestra por sí sola una vulnerabilidad explotable."; }
}
const alerts = [...unique.values()].sort((a, b) => b.riskCode - a.riskCode || a.id.localeCompare(b.id));
const riskCounts = { high: 0, medium: 0, low: 0, informational: 0 };
for (const alert of alerts) riskCounts[["informational", "low", "medium", "high"][alert.riskCode]]++;
const hash = crypto.createHash("sha256");
const sources = ["api", "backend/app.js", "backend/server.js", "backend/config", "backend/models", "backend/middlewares", "backend/routes", "backend/services", "backend/utils", "backend/assets", "Style/login_app/src", "Style/login_app/index.html", "Style/login_app/vite.config.js", "package.json", "package-lock.json", "backend/package.json", "Style/login_app/package.json", "vercel.json"];
function fingerprint(relative) {
  const absolute = path.join(root, relative);
  if (fs.statSync(absolute).isDirectory()) { for (const child of fs.readdirSync(absolute).sort()) fingerprint(path.join(relative, child)); }
  else { hash.update(relative.replaceAll("\\", "/")); hash.update(fs.readFileSync(absolute)); }
}
sources.forEach(fingerprint);
const summary = {
  project: "SESHA APP - Proyecto SENA", date: "2026-11-13", timezone: "America/Bogota",
  generatedAt: new Date().toISOString(),
  source: { baseCommit: spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim(), applicationSha256: hash.digest("hex"), note: "Base Git más ajustes locales previamente publicados; la huella excluye .env y resultados de pruebas." },
  environment: read("environment.json"), functional,
  protection: read("protection-limits.json"),
  performance: { runs, sustained, shortPeak: short, firstShortFailure: shortFail, loginPassed: login, loginFailed: loginFail,
    criteria: { mixedP95Ms: 500, certificateP95Ms: 1500, loginP95Ms: 1000, errorRateLessThan: 0.01, droppedIterations: 0 },
    note: "Cargas generadas y servidas en el mismo equipo, con MongoDB temporal y límites de tasa desactivados solo en el puerto de capacidad. No representa capacidad de Vercel/Atlas ni número de usuarios simultáneos." },
  security: { version: "2.17.0", ...read("zap-run.json"), riskCounts, alerts, productionHeaders: headers, npmAudit: read("npm-audit.json").metadata?.vulnerabilities,
    scopeNote: "Escaneo activo local autenticado con token sintético, crawler tradicional y dos hilos. Sin DOM/AJAX spider ni prueba de penetración exhaustiva. Duración activa máxima configurada: 3 minutos." },
};
const serialized = JSON.stringify(summary, null, 2);
if (/mongodb\+srv:\/\/|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|JWT_SECRET\s*[:=]\s*["']/.test(serialized)) throw new Error("Contenido sensible detectado en resumen público");
fs.writeFileSync(path.join(target, "resultados.json"), serialized);
console.log(JSON.stringify({ functionalPassed: functional.passed, functionalTotal: functional.total, sustainedRps: sustained?.targetRps, shortPeakRps: short?.targetRps, loginRps: login?.targetRps, zapRisks: riskCounts, npmVulnerabilities: summary.security.npmAudit?.total }));
