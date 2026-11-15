// Comprueba la publicación estática sin credenciales ni peticiones a la API de SESHA.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const date = process.env.REPORT_DATE || "2026-11-15";
assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
const base = "https://alexriver101219.github.io/PROYECTO_SENA/";
const directory = path.join(root, "docs/pruebas", date);
const manifest = JSON.parse(fs.readFileSync(path.join(directory, "documentos.json"), "utf8"));
const expected = ["informe-pruebas-funcionales.pdf", "informe-rendimiento-k6.pdf", "informe-seguridad-zap.pdf", "informe-seguridad-zap-vercel.pdf"];
assert.deepEqual(manifest.files.map((item) => item.file).sort(), expected.sort());
const documentationDate = "2026-11-15";
const technicalDirectory = path.join(root, "docs/informes", documentationDate);
const technicalManifest = path.join(technicalDirectory, "documento.json");
const additional = [];
const presentationDirectory = path.join(root, "docs/presentacion", documentationDate);
const presentationManifest = path.join(presentationDirectory, "archivos.json");
if (fs.existsSync(presentationManifest)) {
  const presentation = JSON.parse(fs.readFileSync(presentationManifest, "utf8"));
  assert.equal(presentation.mainSlides, 18);
  assert.equal(presentation.supportSlides, 4);
  for (const file of [...presentation.files.map((item) => item.file), "archivos.json"]) {
    assert.equal(path.basename(file), file);
    additional.push({ file: `presentacion/${documentationDate}/${file}`, route: `presentacion/${documentationDate}/${file}`,
      local: path.join(presentationDirectory, file) });
  }
}
if (fs.existsSync(technicalManifest)) {
  const technical = JSON.parse(fs.readFileSync(technicalManifest, "utf8"));
  assert.equal(technical.file, "informe-tecnico-consolidado-sesha.pdf");
  for (const file of [technical.file, "documento.json"]) additional.push({
    file: `informes/${documentationDate}/${file}`, route: `informes/${documentationDate}/${file}`, local: path.join(technicalDirectory, file),
  });
}
for (const file of ["manual-usuario-sesha.pdf", "verificacion-entrega.json"]) additional.push({
  file: `manual/${documentationDate}/${file}`, route: `manual/${documentationDate}/${file}`, local: path.join(root, "docs/manual", documentationDate, file),
});
additional.push({ file: `actualizaciones/${documentationDate}/verificacion.json`, route: `actualizaciones/${documentationDate}/verificacion.json`,
  local: path.join(root, "docs/actualizaciones", documentationDate, "verificacion.json") });
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const records = [];
async function request(route, stamp) {
  const response = await fetch(base + route + (stamp ? `?revision=${stamp}` : ""), { redirect: "error", signal: AbortSignal.timeout(25000) });
  return { status: response.status, bytes: Buffer.from(await response.arrayBuffer()), type: response.headers.get("content-type") || "" };
}
async function main() {
  const localIndex = fs.readFileSync(path.join(root, "docs/index.html"));
  const revision = digest(localIndex).slice(0, 12);
  let ready = false;
  const max = process.argv.includes("--wait") ? 18 : 1;
  for (let i = 0; i < max; i++) {
    const index = await request("", revision);
    if (index.status === 200 && digest(index.bytes) === digest(localIndex)) {
      records.push({ file: "index.html", status: index.status, identical: true }); ready = true; break;
    }
    console.log(JSON.stringify({ pagesPending: true, attempt: i + 1, status: index.status }));
    if (i < max - 1) await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  assert.ok(ready, "Pages todavía no refleja esta edición");
  const downloads = [...expected, "resultados.json", "zap-vercel-resultados.json", "documentos.json"].map((file) => ({
    file, route: `pruebas/${date}/${file}`, local: path.join(directory, file),
  })).concat(additional);
  await Promise.all(downloads.map(async ({ file, route, local }) => {
    const localFile = fs.readFileSync(local);
    const remote = await request(route, revision);
    assert.equal(remote.status, 200);
    if (file.endsWith(".pdf")) assert.equal(remote.bytes.subarray(0, 5).toString(), "%PDF-");
    assert.equal(digest(remote.bytes), digest(localFile), `La copia remota difiere: ${file}`);
    records.push({ file, status: remote.status, bytes: remote.bytes.length, identical: true });
  }));
  const output = path.join(root, ".qa", "documentation-2026-11-15", "pages-verification.json");
  const result = { target: base, checkedAt: new Date().toISOString(), date, verified: true,
    records: records.sort((a, b) => a.file.localeCompare(b.file)), credentialsUsed: false };
  fs.writeFileSync(output, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
main().catch(() => { console.error("La edición de Pages no quedó verificada; detalles de red omitidos."); process.exitCode = 1; });
