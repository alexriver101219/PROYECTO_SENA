const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const output = path.resolve(__dirname, "../.qa/assessment-2026-11-13");
const state = JSON.parse(fs.readFileSync(path.join(output, "session.json")));
(async () => {
  const identity = await (await fetch(state.strictApi + "/__qa/identity")).json();
  assert.equal(identity.isolated, true); assert.equal(identity.limits, true); assert.equal(identity.runId, state.runId);
  assert.match(state.databaseUri, /^mongodb:\/\/127\.0\.0\.1:/);
  const c = await mongoose.createConnection(state.databaseUri, { autoIndex: false, autoCreate: false }).asPromise();
  try {
    const counters = c.db.collection("ratelimits"); await counters.deleteMany({});
    const apiCodes = [];
    for (let i = 0; i < 121; i++) apiCodes.push((await fetch(state.strictApi + "/api/ready")).status);
    assert.ok(apiCodes.slice(0, 120).every(code => code === 200)); assert.equal(apiCodes[120], 429);
    await counters.deleteMany({});
    const authCodes = [];
    for (let i = 0; i < 21; i++) authCodes.push((await fetch(state.strictApi + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@sesha.com", password: "incorrecta" }) })).status);
    assert.ok(authCodes.slice(0, 20).every(code => code === 401)); assert.equal(authCodes[20], 429);
    fs.writeFileSync(path.join(output, "protection-limits.json"), JSON.stringify({ api: { allowed: 120, windowSeconds: 60, firstBlockedRequest: 121, status: 429 }, auth: { allowed: 20, windowSeconds: 900, firstBlockedRequest: 21, status: 429 }, scope: "por IP, contadores en MongoDB temporal", passed: true }, null, 2));
    console.log("Límites confirmados: petición API 121 devuelve 429; intento de acceso 21 devuelve 429.");
  } finally { await c.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
