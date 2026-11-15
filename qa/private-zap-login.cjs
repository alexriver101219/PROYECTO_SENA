// Utilidad temporal del propietario: solo loopback, destino fijo y ningún registro de claves.
const http = require("node:http"), fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const local = "http://127.0.0.1:5177";
const target = "https://sesha-app.vercel.app";
const output = path.join(root, ".qa/zap-vercel-2026-11-14");
const sessionFile = path.join(output, "sessions-private.json");
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") throw new Error("Se requiere TLS verificado");
fs.mkdirSync(output, { recursive: true });
if (process.platform === "win32") {
  const protect = `$ErrorActionPreference='Stop'
$acl=New-Object Security.AccessControl.DirectorySecurity
$acl.SetAccessRuleProtection($true,$false)
$owner=[Security.Principal.WindowsIdentity]::GetCurrent().User
foreach($sid in @($owner,(New-Object Security.Principal.SecurityIdentifier('S-1-5-18')))) {
 $acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')))
}
[IO.Directory]::SetAccessControl($env:SESHA_ZAP_PRIVATE_DIR,$acl)`;
  try { execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", protect],
    { env: { ...process.env, SESHA_ZAP_PRIVATE_DIR: output }, windowsHide: true, stdio: "pipe" }); }
  catch { throw new Error("No se pudo proteger el directorio de sesiones"); }
} else fs.chmodSync(output, 0o700);
if (require("node:child_process").spawnSync("git", ["check-ignore", "-q", sessionFile], { cwd: root, windowsHide: true }).status !== 0)
  throw new Error("La sesión debe quedar excluida de Git");
const nonce = crypto.randomBytes(32).toString("hex");
let attempts = 0, busy = false, complete = false;
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SESHA - acceso privado para ZAP</title><link rel="stylesheet" href="/access.css"></head><body><main><small>HERRAMIENTA LOCAL DEL PROYECTO</small><h1>Acceso privado para ZAP</h1><p>Introduce las claves actuales de estas dos cuentas para revisar SESHA de forma autenticada.</p><p class="target">Destino único: <strong>https://sesha-app.vercel.app</strong></p><form id="access"><label for="admin">Administrador: admin@sesha.com</label><input id="admin" type="password" autocomplete="current-password" required maxlength="72"><label for="employee">Empleado: carlos.mendoza@sesha.com</label><input id="employee" type="password" autocomplete="current-password" required maxlength="72"><button id="submit">Confirmar accesos para ZAP</button></form><p id="status" role="status" aria-live="polite">Las contraseñas no se guardan. Solo se conservan temporalmente las sesiones en la carpeta privada de pruebas.</p><p class="small">No escribas claves en el chat. Esta herramienta no cambia contraseñas, cuentas, roles ni datos laborales. Cuando aparezca la confirmación puedes cerrar esta pestaña.</p></main><script src="/access.js"></script></body></html>`;
const css = `*{box-sizing:border-box}body{margin:0;background:#eef4f8;color:#26374a;font:16px/1.55 system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}main{max-width:570px;background:white;border:1px solid #d5e2eb;border-radius:16px;padding:30px;box-shadow:0 12px 36px #142c4512}small{font-size:11px;font-weight:700;letter-spacing:.1em;color:#087f80}h1{color:#142c45;font-size:27px;line-height:1.2}label{display:block;font-size:14px;font-weight:650;margin-top:20px}input{width:100%;padding:12px;margin-top:7px;border:1px solid #92aaba;border-radius:7px;font:inherit}button{margin-top:24px;width:100%;background:#087f80;color:white;border:0;border-radius:7px;padding:13px;font:inherit;font-weight:650;cursor:pointer}button:disabled{opacity:.6;cursor:wait}.target{background:#eef8f6;border-left:3px solid #087f80;padding:12px;font-size:14px}.small,#status{font-size:13px;color:#526477}`;
const js = `const form=document.getElementById('access'),button=document.getElementById('submit'),status=document.getElementById('status');form.addEventListener('submit',async e=>{e.preventDefault();if(button.disabled)return;button.disabled=true;status.textContent='Confirmando los accesos...';let payload={adminPassword:document.getElementById('admin').value,employeePassword:document.getElementById('employee').value};try{const c=await fetch('/challenge',{cache:'no-store'});const proof=await c.json();const pending=fetch('/sessions',{method:'POST',headers:{'Content-Type':'application/json','X-QA-CSRF':proof.nonce},body:JSON.stringify(payload)});payload=null;form.reset();const response=await pending;const result=await response.json();status.textContent=result.message;if(response.ok){form.remove();return}}catch{status.textContent='No se pudo confirmar el acceso. Revisa la conexión y vuelve a introducir las claves.'}finally{payload=null;form.reset();button.disabled=false}});`;
function reply(res, status, body, type = "application/json; charset=utf-8") {
  if (res.destroyed || res.writableEnded) return;
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}
const server = http.createServer(async (req, res) => {
  if (req.headers.host !== "127.0.0.1:5177" || req.socket.remoteAddress !== "127.0.0.1") return reply(res, 403, { message: "Solo acceso local" });
  if (req.method === "GET" && req.url === "/") {
    res.setHeader("Set-Cookie", `sesha_qa_nonce=${nonce}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800`);
    return reply(res, 200, html, "text/html; charset=utf-8");
  }
  if (req.method === "GET" && req.url === "/access.css") return reply(res, 200, css, "text/css; charset=utf-8");
  if (req.method === "GET" && req.url === "/access.js") return reply(res, 200, js, "text/javascript; charset=utf-8");
  const cookie = (req.headers.cookie || "").split(";").some((part) => part.trim() === `sesha_qa_nonce=${nonce}`);
  if (req.method === "GET" && req.url === "/challenge") return cookie ? reply(res, 200, { nonce }) : reply(res, 403, {});
  if (req.method !== "POST" || req.url !== "/sessions") return reply(res, 404, {});
  if (req.headers.origin !== local || !cookie || req.headers["x-qa-csrf"] !== nonce) return reply(res, 403, { message: "Recarga esta página local antes de continuar." });
  if (complete || attempts >= 5 || busy) return reply(res, 409, { message: "La herramienta está ocupada, ya terminó o alcanzó el límite de intentos." });
  busy = true;
  let data, bytes = 0;
  const chunks = [];
  const sessions = [];
  try {
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 4096) { reply(res, 413, { message: "Entrada demasiado grande" }); return; }
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    try { data = JSON.parse(buffer.toString("utf8")); } finally { buffer.fill(0); chunks.forEach((chunk) => chunk.fill(0)); }
    if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).some((key) => !["adminPassword", "employeePassword"].includes(key)) ||
      [data.adminPassword, data.employeePassword].some((value) => typeof value !== "string" || value.length < 6 || Buffer.byteLength(value) > 72))
      return reply(res, 400, { message: "Introduce las dos claves actuales; máximo 72 bytes por clave." });
    attempts++;
    for (const [email, role, field] of [["admin@sesha.com", "admin", "adminPassword"], ["carlos.mendoza@sesha.com", "employee", "employeePassword"]]) {
      const response = await fetch(target + "/api/auth/login", { method: "POST", redirect: "error", signal: AbortSignal.timeout(30000),
        headers: { "Content-Type": "application/json", Origin: target }, body: JSON.stringify({ email, password: data[field] }) });
      data[field] = "";
      if (response.status !== 200) throw new Error("Acceso no confirmado");
      const result = await response.json();
      const sessionCookie = response.headers.get("set-cookie")?.split(";")[0];
      if (result.user?.email !== email || result.user?.role !== role || !sessionCookie?.startsWith("sesha_session=")) throw new Error("Identidad no confirmada");
      sessions.push({ email, role, cookie: sessionCookie, csrfToken: result.csrfToken });
    }
    fs.writeFileSync(sessionFile, JSON.stringify({ target, createdAt: new Date().toISOString(), sessions }), { mode: 0o600 });
    complete = true;
    reply(res, 200, { message: "Accesos confirmados. Puedes cerrar esta pestaña; continuaré con ZAP sin mostrar las sesiones." });
    console.log("Dos sesiones privadas listas; no se imprimen claves ni tokens.");
    setTimeout(() => server.close(), 2000);
  } catch {
    reply(res, 401, { message: "No se pudieron confirmar ambos accesos. Revisa las claves y la conectividad; no se muestran detalles privados." });
  } finally {
    chunks.forEach((chunk) => chunk.fill(0));
    if (data && typeof data === "object") { data.adminPassword = ""; data.employeePassword = ""; }
    data = null; sessions.fill(null); busy = false;
  }
});
server.on("error", () => { console.error("No se pudo abrir el formulario privado local; no se cambia a otro puerto."); process.exitCode = 1; });
server.listen(5177, "127.0.0.1", () => console.log("Formulario privado listo en http://127.0.0.1:5177; destino fijo SESHA en Vercel."));
const expiry = setTimeout(() => server.close(), 30 * 60000); expiry.unref();
process.once("SIGINT", () => { clearTimeout(expiry); server.close(); });
