const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const output = path.join(root, ".qa/assessment-2026-11-13");
const session = path.join(output, "session.json");
const results = [];

async function run(kind, rate, duration, label) {
  const file = path.join(output, `k6-${label || kind + "-" + rate}.json`);
  const start = new Date().toISOString();
  await new Promise((resolve, reject) => {
    const child = spawn("k6", ["run", "--quiet", path.join(root, "qa/k6/capacity.js")], { cwd: root, env: {
      ...process.env, K6_NO_USAGE_REPORT: "true", K6_WEB_DASHBOARD: "false", QA_SESSION_FILE: session, QA_RESULT: file, QA_KIND: kind, QA_RATE: String(rate), QA_DURATION: duration,
    }, windowsHide: true });
    let log = ""; child.stdout.on("data", data => { log += data; }); child.stderr.on("data", data => { log += data; });
    child.on("error", reject); child.on("close", code => { fs.writeFileSync(file + ".log", log); if (![0, 99].includes(code)) reject(new Error("k6 terminó con código " + code)); else resolve(); });
  });
  const summary = JSON.parse(fs.readFileSync(file));
  const metrics = summary.metrics;
  const values = name => metrics[name]?.values || {};
  const latency = values("http_req_duration{kind:workload}");
  const entry = {
    kind, targetRps: rate, duration, label: label || kind + "-" + rate, start, end: new Date().toISOString(),
    p95Ms: latency["p(95)"], p99Ms: latency["p(99)"], avgMs: latency.avg, maxMs: latency.max,
    pdfP95Ms: values("http_req_duration{endpoint:/api/documentos/certificado}")["p(95)"],
    failedRate: values("http_req_failed{kind:workload}").rate || 0,
    businessFailedRate: values("business_failures").rate || 0,
    requests: values("workload_requests").count, achievedRps: values("workload_requests").rate,
    requestMix: Object.fromEntries(["dashboard", "employees", "requests", "documents", "certificate"].map(name => [name, values("requests_" + name).count || 0])),
    droppedIterations: values("dropped_iterations").count || 0,
    maxActiveVus: values("vus").max,
    passed: Object.values(metrics).every(metric => Object.values(metric.thresholds || {}).every(threshold => threshold.ok)),
  };
  results.push(entry); fs.writeFileSync(path.join(output, "k6-results.json"), JSON.stringify({ runs: results }, null, 2));
  console.log(JSON.stringify(entry)); return entry;
}
module.exports = { run, results };
if (require.main === module) (async () => {
  await run("mixed", 5, "10s", "warmup");
  for (const rate of [5, 25, 50, 100, 200, 400]) { const result = await run("mixed", rate, "25s"); if (!result.passed) break; }
  await run("mixed", 5, "20s", "recovery");
  for (const rate of [1, 2, 3, 4, 8]) { const result = await run("login", rate, "20s"); if (!result.passed) break; }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
