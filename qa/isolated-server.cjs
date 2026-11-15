// Entorno desechable: nunca carga .env ni utiliza Atlas.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const http = require("node:http");
const os = require("node:os");
const { monitorEventLoopDelay } = require("node:perf_hooks");
const root = path.resolve(__dirname, "..");
const output = path.resolve(root, process.env.QA_OUTPUT || ".qa/assessment-2026-11-13");
fs.mkdirSync(output, { recursive: true });
process.env.NODE_ENV = "production";
process.env.JWT_SECRET = crypto.randomBytes(48).toString("base64url");
process.env.APP_ORIGIN = "http://127.0.0.1:4174,http://127.0.0.1:8100,http://127.0.0.1:8101";
delete process.env.VERCEL;
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const express = require("express");
const bcrypt = require("bcryptjs");
const servers = [];
let memory, timer, requests = 0;

async function main() {
  memory = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { downloadDir: path.join(root, ".mongodb-binaries") },
  });
  process.env.MONGO_URI = memory.getUri("sesha_qa_assessment");
  const { connectDB } = require("../backend/config/db");
  await connectDB();
  const { seed } = require("../backend/scripts/seed");
  process.env.SEED_ADMIN_PASSWORD = "test-only-fixture-0-credentials";
  process.env.SEED_CARLOS_PASSWORD = "test-only-fixture-1-credentials";
  process.env.SEED_LAURA_PASSWORD = "test-only-fixture-1-credentials";
  await seed();
  const User = require("../backend/models/User");
  const Empleado = require("../backend/models/Empleado");
  const password = await bcrypt.hash("test-only-fixture-1-credentials", 12);
  const extraUsers = await User.insertMany(Array.from({ length: 149 }, (_, i) => ({
    name: "Empleado QA " + String(i + 1).padStart(3, "0"),
    email: `qa.${i + 1}@sesha.com`, password, role: "employee",
  })));
  await Empleado.insertMany(extraUsers.map((user, i) => ({
    user: user._id, name: user.name, document: String(9900000000 + i),
    position: "Guarda de seguridad", department: "Operaciones", status: "Activo", hireDate: "2022-01-10",
  })));
  const { createApp } = require("../backend/app");
  for (const Model of Object.values(mongoose.models)) await Model.createIndexes();
  const runId = "sesha-qa-" + Date.now();
  const identity = limits => ({ isolated: true, database: "sesha_qa_assessment", runId, limits });
  async function api(port, limits) {
    const wrapper = express();
    wrapper.disable("x-powered-by");
    wrapper.get("/__qa/identity", (_req, res) => res.json(identity(limits)));
    wrapper.use((_req, _res, next) => { requests++; next(); });
    wrapper.use(createApp({ limits }));
    const server = wrapper.listen(port, "127.0.0.1");
    await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
    servers.push(server);
  }
  await api(8100, true);
  await api(8101, false);
  const dist = path.join(root, "Style/login_app/dist");
  const staticApp = express();
  staticApp.disable("x-powered-by");
  const publicHeaders = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"))).headers[0].headers;
  staticApp.use((_req, res, next) => { for (const header of publicHeaders) res.set(header.key, header.value); next(); });
  staticApp.use(express.static(dist));
  staticApp.get("/{*path}", (_req, res) => res.sendFile(path.join(dist, "index.html")));
  const web = http.createServer((req, res) => {
    if (req.url.startsWith("/api") || req.url.startsWith("/__qa/")) {
      const forward = http.request({ host: "127.0.0.1", port: 8101, method: req.method, path: req.url, headers: req.headers }, incoming => {
        res.writeHead(incoming.statusCode, incoming.headers); incoming.pipe(res);
      });
      forward.on("error", () => { res.writeHead(502); res.end(); }); req.pipe(forward);
    } else staticApp(req, res);
  });
  web.listen(4174, "127.0.0.1");
  await new Promise((resolve, reject) => { web.once("listening", resolve); web.once("error", reject); });
  servers.push(web);
  fs.writeFileSync(path.join(output, "session.json"), JSON.stringify({ runId, databaseUri: process.env.MONGO_URI, api: "http://127.0.0.1:8101", strictApi: "http://127.0.0.1:8100", web: "http://127.0.0.1:4174" }));
  fs.writeFileSync(path.join(output, "environment.json"), JSON.stringify({
    measuredAt: new Date().toISOString(), runId, node: process.version,
    cpu: os.cpus()[0].model, logicalCpus: os.cpus().length,
    totalMemoryGB: os.totalmem() / 1024 ** 3, freeMemoryGB: os.freemem() / 1024 ** 3,
    os: os.platform() + " " + os.release(), seededProfiles: await Empleado.countDocuments(),
    database: "MongoDB temporal, replica set de un nodo", productionUntouched: true,
    capacityMode: "Mismo createApp con limits:false; autenticación y autorización conservadas",
    strictMode: "Mismo createApp con límites 120/min e intentos 20/15min",
  }, null, 2));
  const delay = monitorEventLoopDelay({ resolution: 20 }); delay.enable();
  let previousCpu = process.cpuUsage();
  timer = setInterval(() => {
    const cpu = process.cpuUsage(previousCpu); previousCpu = process.cpuUsage();
    const mem = process.memoryUsage();
    fs.appendFileSync(path.join(output, "server-metrics.jsonl"), JSON.stringify({
      timestamp: new Date().toISOString(), requests, rssMB: mem.rss / 1024 ** 2,
      heapMB: mem.heapUsed / 1024 ** 2, cpuMs: (cpu.user + cpu.system) / 1000,
      eventLoopP95Ms: delay.percentile(95) / 1e6,
    }) + "\n"); delay.reset();
  }, 1000);
  console.log("QA aislado listo: API estricta 8100, capacidad 8101, frontend compilado 4174; perfiles sintéticos 152.");
}
async function stop() {
  clearInterval(timer);
  await Promise.all(servers.map(server => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); })));
  await mongoose.disconnect(); if (memory) await memory.stop();
}
process.once("SIGINT", () => stop().then(() => process.exit(0)));
process.once("SIGTERM", () => stop().then(() => process.exit(0)));
main().catch(async error => { console.error("Fallo QA aislado:", error.name, error.code || "sin código"); await stop(); process.exit(1); });
