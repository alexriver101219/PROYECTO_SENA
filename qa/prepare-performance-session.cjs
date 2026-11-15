// Sesiones sintéticas para medir también solicitudes y nómina del empleado.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const { latestClosedFortnight } = require("../backend/services/payrollPeriods");
const output = path.resolve(__dirname, "..", process.env.QA_OUTPUT || ".qa/revalidation-2026-11-15");
(async () => {
  const file = path.join(output, "session.json"), state = JSON.parse(fs.readFileSync(file));
  assert.equal(state.api, "http://127.0.0.1:8101");
  const identity = await (await fetch(state.api + "/__qa/identity")).json();
  assert.equal(identity.isolated, true); assert.equal(identity.runId, state.runId);
  for (const [email, password, role, key] of [
    ["admin@sesha.com", "test-only-fixture-0-credentials", "admin", "adminToken"],
    ["carlos.mendoza@sesha.com", "test-only-fixture-1-credentials", "employee", "employeeToken"],
    ["laura.gomez@sesha.com", "test-only-fixture-1-credentials", "employee", "payrollToken"],
  ]) {
    const response = await fetch(state.api + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    assert.equal(response.status, 200); assert.equal((await response.json()).user.role, role);
    state[key] = decodeURIComponent(response.headers.get("set-cookie").split(";")[0].slice("sesha_session=".length));
  }
  state.payrollPeriod = latestClosedFortnight();
  fs.writeFileSync(file, JSON.stringify(state));
  console.log("Sesiones sintéticas preparadas para administración, solicitudes y nómina; no se imprimen tokens.");
})().catch(() => { console.error("No se preparó el entorno de carga; detalles privados omitidos."); process.exitCode = 1; });
