// Lecturas e intentos inválidos sin escrituras de negocio en el sitio propio.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."), target = "https://sesha-app.vercel.app";
const output = path.resolve(root, process.env.QA_OUTPUT || ".qa/revalidation-2026-11-15");
const checks = [];
async function request(route, options = {}) {
  const response = await fetch(target + route, { ...options, signal: AbortSignal.timeout(25000), redirect: "error" });
  return { status: response.status, headers: response.headers, bytes: Buffer.from(await response.arrayBuffer()) };
}
async function check(name, action) {
  try { await action(); checks.push({ name, passed: true }); }
  catch { checks.push({ name, passed: false }); throw new Error("Verificación no confirmada"); }
}
(async () => {
  let home;
  await check("Portada disponible y CSP estricta", async () => {
    home = await request("/"); assert.equal(home.status, 200);
    assert.ok(!/unsafe-inline|unsafe-eval/.test(home.headers.get("content-security-policy") || "unsafe-inline"));
  });
  for (const route of ["/login", "/register", "/api/health", "/api/ready"]) await check(route + " disponible", async () => assert.equal((await request(route)).status, 200));
  await check("Registro público cerrado y sin caché", async () => {
    const result = await request("/api/auth/registration"); assert.equal(result.status, 200);
    assert.equal(JSON.parse(result.bytes).enabled, false); assert.match(result.headers.get("cache-control"), /no-store/);
  });
  for (const [route, expected] of [["/api/auth/register", 403], ["/api/auth/change-password", 400], ["/api/empleados", 401]])
    await check("Entrada inválida a " + route + " rechazada", async () => assert.equal((await request(route, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, expected));
  for (const route of ["/api/auth/me", "/api/documentos/nomina", "/api/documentos/nomina/pdf", "/api/solicitudes/formulario"])
    await check(route + " exige autenticación", async () => assert.equal((await request(route)).status, 401));
  await check("JavaScript publicado coincide con la compilación contrastada", async () => {
    const local = fs.readFileSync(path.join(root, "Style/login_app/dist/index.html"), "utf8"), asset = local.match(/src="(\/assets\/[^"/]+\.js)"/)[1];
    assert.ok(home.bytes.toString().includes(asset));
    const remote = await request(asset); assert.equal(remote.status, 200);
    assert.deepEqual(remote.bytes, fs.readFileSync(path.join(root, "Style/login_app/dist", asset)));
  });
  await check("Archivos privados no expuestos por HTTP", async () => {
    for (const route of ["/.env", "/backend/.env", "/.git/config"]) {
      const response = await request(route); assert.ok(response.status === 404 || /text\/html/.test(response.headers.get("content-type") || ""));
      assert.ok(!/MONGO_URI\s*=|JWT_SECRET\s*=|\[remote "origin"\]/.test(response.bytes.toString()));
    }
  });
})().catch(() => { process.exitCode = 1; }).finally(() => {
  const result = { target, timestamp: new Date().toISOString(), passed: checks.filter(x => x.passed).length, failed: checks.filter(x => !x.passed).length,
    checks, ownerPasswordsUsed: false, businessWritesPerformed: false };
  fs.writeFileSync(path.join(output, "production-verification.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
});
