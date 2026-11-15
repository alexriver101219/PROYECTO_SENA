// Solo lectura: no hace escaneo activo ni genera carga sobre el sitio publicado.
const fs = require("node:fs");
const path = require("node:path");
const base = "https://sesha-app.vercel.app";
(async () => {
  const results = [];
  for (const route of ["/", "/login", "/api/health", "/api/ready"]) {
    const res = await fetch(base + route, { signal: AbortSignal.timeout(15000) });
    const names = ["content-security-policy", "strict-transport-security", "x-frame-options", "x-content-type-options", "referrer-policy", "cache-control", "x-powered-by"];
    results.push({ route, status: res.status, headers: Object.fromEntries(names.map(name => [name, res.headers.get(name)])) });
    await res.arrayBuffer();
  }
  fs.writeFileSync(path.resolve(__dirname, "..", process.env.QA_OUTPUT || ".qa/assessment-2026-11-13", "production-headers.json"), JSON.stringify({ timestamp: new Date().toISOString(), base, method: "cuatro solicitudes GET; sin escaneo activo ni prueba de carga", results }, null, 2));
  console.log("Lectura de cabeceras de producción:", results.map(r => r.route + "=" + r.status).join(", "));
})().catch(error => { console.error(error.name, error.cause?.code || "fallo HTTP"); process.exitCode = 1; });
