const crypto = require("crypto");
const Empleado = require("../models/Empleado");
const laborPositions = require("../config/laborPositions");

const allocations = [
  { position: "Escolta de mercancías", count: 6 },
  { position: "Escolta VIP", count: 6 },
  { position: "Operador de medios tecnológicos", count: 4 },
  { position: "Coordinador de escoltas", count: 2 },
  { position: "Técnico de medios tecnológicos", count: 2 },
  { position: "Supervisor de medios tecnológicos", count: 2 },
  { position: "Guarda canino", count: 20 },
  { position: "Auxiliar de almacén", count: 2 },
];
const sourcePosition = "Guarda de seguridad";
const expectedGuards = 127;
const totalChanges = allocations.reduce((sum, job) => sum + job.count, 0);
const stateFields = ["user", "name", "document", "position", "department", "status", "hireDate", "createdAt"];
function stateHash(profiles) {
  const canonical = [...profiles].sort((a, b) => String(a._id).localeCompare(String(b._id))).map(profile => [String(profile._id), ...stateFields.map(field => profile[field] ?? null)]);
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
function counts(profiles) {
  const result = {};
  for (const profile of profiles) result[profile.position] = (result[profile.position] || 0) + 1;
  return result;
}
function projected(profiles, changes) {
  const byId = new Map(changes.map(change => [change.id, change.to]));
  return profiles.map(profile => ({ ...profile, ...(byId.get(String(profile._id)) || {}) }));
}
function buildGuardPlan(profiles) {
  const guards = profiles.filter(profile => profile.position === sourcePosition).sort((a, b) => String(b._id).localeCompare(String(a._id)));
  if (guards.length !== expectedGuards) throw new Error("Se esperaban exactamente 127 guardas; no se generó el plan");
  if (allocations.some(job => profiles.some(profile => profile.position === job.position))) throw new Error("Ya existen cargos de destino; revisar antes de redistribuir");
  const changes = [];
  for (const job of allocations) {
    const department = laborPositions.find(item => item.position === job.position)?.department;
    if (!department) throw new Error("Cargo ausente del catálogo");
    for (let i = 0; i < job.count; i++) {
      const guard = guards.shift();
      changes.push({ id: String(guard._id), from: { position: guard.position, department: guard.department }, to: { position: job.position, department } });
    }
  }
  const after = projected(profiles, changes);
  return { version: 1, database: "proyecto_sena", createdAt: new Date().toISOString(), totalProfiles: profiles.length, beforeHash: stateHash(profiles), afterHash: stateHash(after), beforeCounts: counts(profiles), afterCounts: counts(after), changes };
}
function validatePlan(plan) {
  if (plan.version !== 1 || plan.database !== "proyecto_sena" || plan.changes?.length !== totalChanges || new Set(plan.changes.map(change => change.id)).size !== totalChanges) throw new Error("Plan inválido");
  for (const job of allocations) {
    const expected = laborPositions.find(item => item.position === job.position);
    const changes = plan.changes.filter(change => change.to.position === job.position);
    if (changes.length !== job.count || changes.some(change => !/^[a-f\d]{24}$/i.test(change.id) || change.from.position !== sourcePosition || change.to.department !== expected.department)) throw new Error("El plan no coincide con la distribución autorizada");
  }
}
async function applyGuardPlan(plan, session) {
  validatePlan(plan);
  const profiles = await Empleado.find().lean().session(session);
  const currentHash = stateHash(profiles);
  if (currentHash === plan.afterHash) return { changes: 0, alreadyApplied: true, counts: counts(profiles), total: profiles.length };
  if (currentHash !== plan.beforeHash || profiles.length !== plan.totalProfiles || counts(profiles)[sourcePosition] !== expectedGuards) throw new Error("Los perfiles cambiaron desde el plan; no se aplicó ninguna modificación");
  if (stateHash(projected(profiles, plan.changes)) !== plan.afterHash) throw new Error("La huella del plan no coincide");
  const result = await Empleado.bulkWrite(plan.changes.map(change => ({ updateOne: { filter: { _id: change.id, position: change.from.position, department: change.from.department }, update: { $set: { position: change.to.position, department: change.to.department } } } })), { session });
  if (result.matchedCount !== totalChanges || result.modifiedCount !== totalChanges) throw new Error("No coincidieron los 44 perfiles; se revierte la transacción");
  const after = await Empleado.find().lean().session(session);
  if (stateHash(after) !== plan.afterHash) throw new Error("Verificación posterior fallida; se revierte la transacción");
  return { changes: result.modifiedCount, alreadyApplied: false, counts: counts(after), total: after.length };
}
module.exports = { allocations, buildGuardPlan, applyGuardPlan, stateHash };
