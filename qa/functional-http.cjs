const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const output = path.resolve(__dirname, "../.qa/assessment-2026-11-13");
const state = JSON.parse(fs.readFileSync(path.join(output, "session.json")));
const base = "http://127.0.0.1:8101";
const results = [];
let database;
async function test(name, action) {
  const start = performance.now();
  try { await action(); results.push({ name, status: "passed", durationMs: performance.now() - start }); console.log("PASS", name); }
  catch (error) { results.push({ name, status: "failed", durationMs: performance.now() - start, error: error.message.slice(0, 350) }); throw error; }
}
async function call(route, { method = "GET", session, body, raw, csrf = true, headers = {} } = {}) {
  const h = { ...headers };
  if (session) { h.Cookie = session.cookie; if (csrf) h["X-CSRF-Token"] = session.csrf; }
  let data = raw;
  if (body !== undefined) { h["Content-Type"] = "application/json"; data = JSON.stringify(body); }
  const response = await fetch(base + route, { method, headers: h, body: data, signal: AbortSignal.timeout(15000) });
  const bytes = Buffer.from(await response.arrayBuffer());
  let json; try { json = JSON.parse(bytes); } catch { /* PDF o respuesta vacía. */ }
  return { status: response.status, headers: response.headers, bytes, json };
}
function status(response, expected) { assert.equal(response.status, expected); return response; }
async function login(email, password) {
  const response = status(await call("/api/auth/login", { method: "POST", body: { email, password } }), 200);
  return { cookie: response.headers.get("set-cookie").split(";")[0], csrf: response.json.csrfToken, response };
}
function upload(data, name = "prueba.pdf", type = "application/pdf") {
  const form = new FormData(); form.append("file", new Blob([data], { type }), name); return form;
}

(async () => {
  const identity = await (await fetch(base + "/__qa/identity")).json();
  assert.equal(identity.isolated, true); assert.equal(identity.runId, state.runId);
  assert.match(state.databaseUri, /^mongodb:\/\/127\.0\.0\.1:/);
  database = await mongoose.createConnection(state.databaseUri, { autoIndex: false, autoCreate: false }).asPromise();
  assert.equal(database.name, "sesha_qa_assessment");
  for (const collection of ["documentos", "solicituds"]) await database.db.collection(collection).deleteMany({});
  const previous = await database.db.collection("empleados").findOne({ email: "http.nueva@sesha.com" });
  if (previous) { await database.db.collection("perfiles_empleados").deleteOne({ user: previous._id }); await database.db.collection("empleados").deleteOne({ _id: previous._id }); }
  await database.db.collection("perfiles_empleados").deleteOne({ document: "9898989898", name: "Persona QA HTTP" });
  let admin, employee, other, certificate, docId, requestId, employeeId;
  await test("F01 - Inicio compilado y recarga directa de ruta React", async () => {
    for (const route of ["/", "/login", "/dashboard"]) {
      const response = await fetch("http://127.0.0.1:4174" + route);
      assert.equal(response.status, 200); assert.match(await response.text(), /<div id="root">/);
    }
  });
  await test("F02 - Salud y disponibilidad de MongoDB temporal", async () => { status(await call("/api/health"), 200); assert.equal(status(await call("/api/ready"), 200).json.status, "ready"); });
  await test("F03 - Dashboard exige autenticación", async () => { status(await call("/api/dashboard"), 401); });
  await test("F04 - Credenciales incorrectas se rechazan", async () => { status(await call("/api/auth/login", { method: "POST", body: { email: "admin@sesha.com", password: "incorrecta" } }), 401); });
  await test("F05 - Ingreso admin con cookie HttpOnly Secure Strict y CSRF", async () => {
    admin = await login("admin@sesha.com", "123456");
    for (const flag of [/HttpOnly/i, /Secure/i, /SameSite=Strict/i]) assert.match(admin.response.headers.get("set-cookie"), flag);
    assert.equal(admin.response.json.user.role, "admin"); assert.match(admin.csrf, /^[a-f0-9]{64}$/);
    assert.equal(admin.response.json.token, undefined); assert.equal(admin.response.json.user.password, undefined);
  });
  await test("F06 - Ingreso de dos empleados independientes", async () => { employee = await login("carlos.mendoza@sesha.com", "Sesha2026!"); other = await login("laura.gomez@sesha.com", "Sesha2026!"); assert.equal(employee.response.json.user.role, "employee"); });
  await test("F07 - Perfil autenticado tiene fecha y datos laborales", async () => { const me = status(await call("/api/auth/me", { session: employee }), 200).json; assert.ok(me.profile.document); assert.ok(me.profile.hireDate); });
  await test("F08 - Empleado no consulta administración de personal", async () => { status(await call("/api/empleados", { session: employee }), 403); });
  await test("F09 - Listado admin paginado y sin hashes", async () => { const data = status(await call("/api/empleados?limit=10&page=1", { session: admin }), 200).json; assert.equal(data.items.length, 10); assert.equal(data.total, 152); assert.ok(!JSON.stringify(data).includes('"password"')); });
  const profile = { name: "Persona QA HTTP", document: "9898989898", position: "Analista QA", department: "Tecnología", status: "Activo", hireDate: "2022-05-10" };
  await test("F10 - Escritura con cookie y sin CSRF se bloquea", async () => { status(await call("/api/empleados", { method: "POST", session: admin, csrf: false, body: profile }), 403); });
  await test("F11 - Admin crea perfil persistido en MongoDB", async () => { const result = status(await call("/api/empleados", { method: "POST", session: admin, body: profile }), 201); employeeId = result.json.id; assert.ok(await database.db.collection("perfiles_empleados").findOne({ _id: new mongoose.Types.ObjectId(employeeId) })); });
  await test("F12 - Admin modifica fecha y cargo", async () => { const updated = status(await call("/api/empleados/" + employeeId, { method: "PUT", session: admin, body: { ...profile, position: "Supervisora QA", hireDate: "2021-03-15" } }), 200); assert.equal(updated.json.position, "Supervisora QA"); assert.equal(updated.json.hireDate, "2021-03-15"); });
  await test("F13 - Fecha laboral futura se rechaza", async () => { status(await call("/api/empleados/" + employeeId, { method: "PUT", session: admin, body: { ...profile, hireDate: "2099-01-01" } }), 400); });
  await test("F14 - Documento duplicado se rechaza", async () => { status(await call("/api/empleados", { method: "POST", session: admin, body: profile }), 409); });
  await test("F15 - Inactivación conserva el perfil y el borrado físico no está expuesto", async () => { const result = status(await call("/api/empleados/" + employeeId, { method: "PUT", session: admin, body: { ...profile, status: "Inactivo" } }), 200); assert.equal(result.json.status, "Inactivo"); status(await call("/api/empleados/" + employeeId, { method: "DELETE", session: admin }), 404); assert.ok(await database.db.collection("perfiles_empleados").findOne({ _id: new mongoose.Types.ObjectId(employeeId), status: "Inactivo" })); });
  await database.db.collection("perfiles_empleados").deleteOne({ _id: new mongoose.Types.ObjectId(employeeId), document: "9898989898" });
  await test("F16 - Constancia laboral válida y nombre de archivo personalizado", async () => {
    const result = status(await call("/api/documentos/certificado", { session: employee }), 200);
    assert.match(result.headers.get("content-type"), /application\/pdf/); assert.match(result.headers.get("content-disposition"), /1000000002\.pdf/);
    assert.equal(result.bytes.subarray(0, 5).toString(), "%PDF-"); certificate = result.bytes;
    fs.writeFileSync(path.join(output, "constancia-qa-http.pdf"), certificate);
  });
  await test("F17 - Carga PDF guarda los bytes en MongoDB", async () => { const result = status(await call("/api/documentos", { method: "POST", session: employee, raw: upload(certificate) }), 201); docId = result.json.id; const doc = await database.db.collection("documentos").findOne({ _id: new mongoose.Types.ObjectId(docId) }); assert.equal(doc.size, certificate.length); assert.ok(Buffer.from(doc.data.buffer).equals(certificate)); });
  await test("F18 - Listado y descarga conservan el PDF", async () => { const list = status(await call("/api/documentos", { session: employee }), 200).json; assert.ok(list.items.some(item => item.id === docId)); assert.ok(status(await call(`/api/documentos/${docId}/download`, { session: employee }), 200).bytes.equals(certificate)); });
  await test("F19 - Otro empleado no descarga el documento", async () => { status(await call(`/api/documentos/${docId}/download`, { session: other }), 404); });
  await test("F20 - Admin puede revisar el documento", async () => { status(await call(`/api/documentos/${docId}/download`, { session: admin }), 200); });
  await test("F21 - Archivo falso con extensión PDF se rechaza", async () => { status(await call("/api/documentos", { method: "POST", session: employee, raw: upload("contenido no PDF") }), 400); });
  await test("F22 - Archivo superior a 3 MiB se rechaza", async () => { const bytes = Buffer.alloc(3 * 1024 * 1024 + 1); bytes.write("%PDF-1.4"); status(await call("/api/documentos", { method: "POST", session: employee, raw: upload(bytes, "grande.pdf") }), 400); });
  await test("F22b - Límite exacto de 3 MiB se acepta", async () => { const bytes = Buffer.alloc(3 * 1024 * 1024, 32); certificate.copy(bytes); const offset = certificate.toString("latin1").match(/startxref\s+(\d+)\s+%%EOF/)[1]; const tail = Buffer.from("\nstartxref\n" + offset + "\n%%EOF\n"); tail.copy(bytes, bytes.length - tail.length); const result = status(await call("/api/documentos", { method: "POST", session: employee, raw: upload(bytes, "limite.pdf") }), 201); status(await call("/api/documentos/" + result.json.id, { method: "DELETE", session: employee }), 204); });
  await test("F23 - Empleado crea solicitud con soporte propio", async () => { const result = status(await call("/api/solicitudes", { method: "POST", session: employee, body: { tipo: "Permiso", descripcion: "Solicitud sintética para pruebas HTTP", documento: docId } }), 201); requestId = result.json.id; assert.equal(result.json.estado, "Pendiente"); });
  await test("F24 - Solicitud de otra cuenta no aparece en su listado", async () => { const result = status(await call("/api/solicitudes", { session: other }), 200).json; assert.ok(!result.items.some(item => item.id === requestId)); });
  await test("F25 - Soporte ajeno no se puede asociar", async () => { status(await call("/api/solicitudes", { method: "POST", session: other, body: { tipo: "Permiso", descripcion: "Intento de soporte ajeno", documento: docId } }), 404); });
  await test("F26 - Adjunto referenciado queda protegido contra borrado", async () => { status(await call("/api/documentos/" + docId, { method: "DELETE", session: employee }), 409); });
  await test("F27 - Dashboard calcula sus documentos y pendientes", async () => { const data = status(await call("/api/dashboard", { session: employee }), 200).json; assert.equal(data.documentos, 1); assert.equal(data.solicitudes, 1); assert.equal(data.pendientes, 1); });
  await test("F28 - Empleado no aprueba solicitudes", async () => { status(await call("/api/solicitudes/" + requestId, { method: "PUT", session: employee, body: { estado: "Aprobado" } }), 403); });
  await test("F29 - Admin aprueba y conserva el cambio", async () => { const result = status(await call("/api/solicitudes/" + requestId, { method: "PUT", session: admin, body: { estado: "Aprobado" } }), 200); assert.equal(result.json.estado, "Aprobado"); });
  await test("F30 - Empleado no cancela una solicitud ya aprobada", async () => { status(await call("/api/solicitudes/" + requestId, { method: "DELETE", session: employee }), 404); });
  await test("F31 - Admin retira la solicitud sintética", async () => { status(await call("/api/solicitudes/" + requestId, { method: "DELETE", session: admin }), 204); });
  await test("F32 - Propietario elimina PDF ya no referenciado", async () => { status(await call("/api/documentos/" + docId, { method: "DELETE", session: employee }), 204); status(await call(`/api/documentos/${docId}/download`, { session: employee }), 404); });
  await test("F33 - Registro público crea cuenta y perfil persistidos", async () => { const result = status(await call("/api/auth/register", { method: "POST", body: { name: "Nueva Persona QA", email: "http.nueva@sesha.com", password: "SeshaQA2026!", position: "Guarda de seguridad" } }), 201); const account = await database.db.collection("empleados").findOne({ email: "http.nueva@sesha.com" }); assert.ok(account); assert.equal(account.role, "employee"); assert.ok(await database.db.collection("perfiles_empleados").findOne({ user: account._id })); assert.equal(result.json.user.password, undefined); });
  await test("F34 - Registro duplicado y elevación de rol se rechazan", async () => { const body = { name: "Nueva Persona QA", email: "http.nueva@sesha.com", password: "SeshaQA2026!" }; status(await call("/api/auth/register", { method: "POST", body }), 409); status(await call("/api/auth/register", { method: "POST", body: { ...body, email: "http.privilegios@sesha.com", role: "admin" } }), 400); });
  await test("F35 - Operador NoSQL como correo se rechaza", async () => { status(await call("/api/auth/login", { method: "POST", body: { email: { $ne: null }, password: "123456" } }), 400); });
  await test("F36 - JWT manipulado no autoriza acceso", async () => { status(await call("/api/dashboard", { headers: { Authorization: "Bearer token-manipulado" } }), 401); });
  await test("F37 - Origen no permitido y JSON inválido se rechazan", async () => { status(await call("/api/ready", { headers: { Origin: "https://origen-no-permitido.invalid" } }), 403); status(await call("/api/auth/login", { method: "POST", raw: "{invalido", headers: { "Content-Type": "application/json" } }), 400); });
  await test("F37b - JSON superior a 16 KiB se rechaza con 413", async () => { status(await call("/api/auth/login", { method: "POST", body: { email: "a".repeat(17000), password: "123456" } }), 413); });
  await test("F38 - Salir exige CSRF y revoca la sesión anterior", async () => { status(await call("/api/auth/logout", { method: "POST", session: employee, csrf: false }), 403); status(await call("/api/auth/logout", { method: "POST", session: employee }), 204); status(await call("/api/auth/me", { session: employee }), 401); });
  const freshAdmin = await login("admin@sesha.com", "123456");
  const token = decodeURIComponent(freshAdmin.cookie.slice("sesha_session=".length));
  state.adminToken = token; state.adminCsrf = freshAdmin.csrf;
  fs.writeFileSync(path.join(output, "session.json"), JSON.stringify(state));
})().catch(error => { console.error("Prueba funcional HTTP interrumpida:", error.message); process.exitCode = 1; })
  .finally(async () => { if (database) await database.close(); fs.writeFileSync(path.join(output, "functional-http.json"), JSON.stringify({ timestamp: new Date().toISOString(), target: "entorno aislado", passed: results.filter(r => r.status === "passed").length, failed: results.filter(r => r.status === "failed").length, tests: results }, null, 2)); });
