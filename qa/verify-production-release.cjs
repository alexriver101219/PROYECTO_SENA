// Verificación limitada del sitio propio: no usa las contraseñas del propietario.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const jwt = require("jsonwebtoken");
const { createMaintenanceClient, assertExpectedTarget } = require("../backend/scripts/lib/password-rotation");
const root = path.resolve(__dirname, "..");
const origin = "https://sesha-app.vercel.app";
const output = path.join(root, ".qa/remediation-2026-11-14");
const checks = [];
const jwtVerification = {};
async function check(name, action) {
  try { await action(); checks.push({ name, passed: true }); }
  catch { checks.push({ name, passed: false }); throw new Error("Verificación fallida; detalles privados omitidos"); }
}
async function call(route, options = {}) {
  const response = await fetch(origin + route, { redirect: "error", signal: AbortSignal.timeout(30000), ...options });
  const body = await response.text();
  return { status: response.status, headers: response.headers, body };
}
async function main() {
  const home = await call("/");
  await check("Portada HTTP 200 y política CSP estricta", async () => {
    assert.equal(home.status, 200);
    assert.ok(!/unsafe-inline|unsafe-eval/.test(home.headers.get("content-security-policy") || "unsafe-inline"));
    assert.equal(home.headers.get("x-content-type-options"), "nosniff");
  });
  for (const route of ["/login", "/register", "/api/health", "/api/ready"])
    await check(`${route} disponible`, async () => assert.equal((await call(route)).status, 200));
  await check("Registro público cerrado y sin caché", async () => {
    const response = await call("/api/auth/registration");
    assert.equal(response.status, 200);
    assert.equal(JSON.parse(response.body).enabled, false);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal((await call("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 403);
  });
  await check("Cambio de contraseña publicado y valida campos", async () => {
    assert.equal((await call("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 400);
  });
  await check("Alta administrativa exige autenticación", async () => {
    assert.equal((await call("/api/empleados", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 401);
  });
  await check("API privada rechaza acceso anónimo", async () => assert.equal((await call("/api/auth/me")).status, 401));
  await check("Javascript publicado coincide con el compilado probado", async () => {
    const local = fs.readFileSync(path.join(root, "Style/login_app/dist/index.html"), "utf8");
    const asset = local.match(/src="(\/assets\/[^"/]+\.js)"/)[1];
    assert.ok(home.body.includes(asset));
    const remote = await call(asset);
    assert.equal(remote.status, 200);
    assert.equal(remote.body, fs.readFileSync(path.join(root, "Style/login_app/dist", asset), "utf8"));
  });
  await check("Archivos privados no expuestos por HTTP", async () => {
    for (const route of ["/.env", "/backend/.env", "/.git/config"]) {
      const response = await call(route);
      assert.ok(response.status === 404 || /text\/html/.test(response.headers.get("content-type") || ""));
      assert.ok(!/MONGO_URI\s*=|JWT_SECRET\s*=|\[remote "origin"\]/.test(response.body));
    }
  });
  await check("JWT histórico retirado rechazado en producción y API local", async () => {
    jwtVerification.stage = "private-config";
    require("dotenv").config({ quiet: true, path: path.join(root, "backend/.env") });
    const { client, target } = createMaintenanceClient(process.env.MONGO_URI);
    assertExpectedTarget(target, { host: "cluster1.nopuzfk.mongodb.net", database: "proyecto_sena" });
    try {
      jwtVerification.stage = "atlas-read";
      await client.connect();
      const admin = await client.db(target.database).collection("empleados").findOne({ email: "admin@sesha.com" },
        { projection: { _id: 1, active: 1, sessionVersion: 1 } });
      assert.equal(admin.active, true);
      jwtVerification.adminActive = true;
      jwtVerification.stage = "historical-reference";
      const ref = execFileSync("git", ["log", "--all", "-1", "--format=%H", "--", "backend/test/auth.test.js"], { cwd: root, encoding: "utf8" }).trim();
      assert.match(ref, /^[a-f0-9]{40}$/);
      const historical = execFileSync("git", ["show", `${ref}^:backend/test/auth.test.js`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      const oldSecret = historical.match(/JWT_SECRET\s*=\s*(?:process\.env\.JWT_SECRET\s*\|\|\s*)?["']([^"']+)["']/)?.[1];
      jwtVerification.historicalLiteralFound = !!oldSecret;
      assert.ok(oldSecret);
      const token = jwt.sign({ version: admin.sessionVersion || 0 }, oldSecret,
        { algorithm: "HS256", subject: String(admin._id), issuer: "sesha-api", audience: "sesha-web", expiresIn: "2m" });
      jwtVerification.stage = "production-revocation";
      jwtVerification.productionStatus = (await call("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })).status;
      assert.equal(jwtVerification.productionStatus, 401);
      jwtVerification.stage = "local-revocation";
      const local = await fetch("http://127.0.0.1:8000/api/auth/me", { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
      jwtVerification.localStatus = local.status;
      assert.equal(local.status, 401);
      jwtVerification.stage = "complete";
    } finally { await client.close(); }
  });
}
main().catch(() => { process.exitCode = 1; }).finally(() => {
  const result = { target: origin, timestamp: new Date().toISOString(), passed: checks.filter((item) => item.passed).length,
    failed: checks.filter((item) => !item.passed).length, checks, jwtVerification, ownerPasswordsUsed: false, businessWritesPerformed: false };
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, "production-verification.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
});
