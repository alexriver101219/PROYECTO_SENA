// Campaña puntual: 44 perfiles de los 127 guardas. Nunca se ejecuta al iniciar la app.
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Empleado = require("../models/Empleado");
const { buildGuardPlan, applyGuardPlan } = require("../services/securityGuardRedistribution");
require("dotenv").config({ path: path.join(__dirname, "../.env"), quiet: true });

async function main() {
  const planIndex = process.argv.indexOf("--plan");
  if (planIndex < 0 || !process.argv[planIndex + 1]) throw new Error("Indica --plan con una ruta dentro de .qa");
  const privateRoot = path.resolve(__dirname, "../../.qa");
  const planPath = path.resolve(process.argv[planIndex + 1]);
  const relative = path.relative(privateRoot, planPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("El plan privado debe permanecer dentro de .qa");
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 8000 });
  if (mongoose.connection.name !== "proyecto_sena") throw new Error("La base de datos no coincide con proyecto_sena");
  if (process.argv.includes("--apply")) {
    const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
    const result = await mongoose.connection.transaction(session => applyGuardPlan(plan, session));
    console.log(JSON.stringify({ applied: !result.alreadyApplied, ...result }));
  } else {
    const plan = buildGuardPlan(await Empleado.find().lean());
    fs.mkdirSync(path.dirname(planPath), { recursive: true });
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), { flag: "wx" });
    console.log(JSON.stringify({ applied: false, total: plan.totalProfiles, changes: plan.changes.length, before: plan.beforeCounts, after: plan.afterCounts }));
  }
}
if (require.main === module) main().catch(() => { console.error("Redistribución no aplicada; detalles privados omitidos."); process.exitCode = 1; }).finally(() => mongoose.disconnect());
module.exports = { main };
