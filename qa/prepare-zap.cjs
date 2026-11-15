const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const output = path.resolve(root, process.env.QA_OUTPUT || ".qa/assessment-2026-11-13");
(async () => {
  const state = JSON.parse(fs.readFileSync(path.join(output, "session.json")));
  assert.equal(state.api, "http://127.0.0.1:8101");
  const identity = await (await fetch(state.api + "/__qa/identity")).json();
  assert.equal(identity.isolated, true); assert.equal(identity.runId, state.runId);
  assert.ok(state.adminToken);
  assert.ok(state.payrollToken && state.payrollPeriod);
  const template = fs.readFileSync(path.join(root, "qa/zap/plan.template.yaml"), "utf8");
  fs.writeFileSync(path.join(output, "zap-private.yaml"), template.replaceAll("__QA_BEARER__", state.adminToken).replaceAll("__QA_EMPLOYEE__", state.payrollToken)
    .replaceAll("__QA_PAYROLL_PERIOD__", state.payrollPeriod.period).replaceAll("__QA_PAYROLL_HALF__", state.payrollPeriod.half).replaceAll("__QA_OUTPUT__", output.replaceAll("\\", "/")));
  fs.mkdirSync(path.join(output, "zap-home"), { recursive: true });
  console.log("Plan ZAP preparado en directorio privado; alcance restringido a 127.0.0.1:4174 y 8101.");
})().catch(error => { console.error(error.message); process.exitCode = 1; });
