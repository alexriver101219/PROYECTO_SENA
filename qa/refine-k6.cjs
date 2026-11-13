const fs = require("node:fs");
const path = require("node:path");
const { run, results } = require("./run-k6.cjs");
const file = path.resolve(__dirname, "../.qa/assessment-2026-11-13/k6-results.json");
results.push(...JSON.parse(fs.readFileSync(file)).runs);
(async () => {
  const candidates = results.filter(r => r.kind === "mixed" && !["warmup", "recovery"].includes(r.label));
  let lower = Math.max(...candidates.filter(r => r.passed).map(r => r.targetRps));
  let upper = Math.min(...candidates.filter(r => !r.passed).map(r => r.targetRps));
  if (Number.isFinite(upper)) {
    for (let i = 0; i < 2; i++) {
      const midpoint = Math.floor((lower + upper) / 2);
      const result = await run("mixed", midpoint, "25s", "refine-" + midpoint);
      if (result.passed) lower = midpoint; else upper = midpoint;
    }
  }
  const confirmed = await run("mixed", lower, "60s", "confirmation-" + lower);
  let stable = confirmed;
  if (!stable.passed && lower !== 100) stable = await run("mixed", 100, "60s", "confirmation-100");
  if (!stable.passed) await run("mixed", 50, "60s", "confirmation-50");
  await run("mixed", 5, "20s", "final-recovery");
})().catch(error => { console.error(error.message); process.exitCode = 1; });
