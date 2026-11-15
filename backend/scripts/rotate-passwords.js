const { readHidden, validateNewPassword } = require("./lib/password-input");
const {
  EMAILS, createMaintenanceClient, assertExpectedTarget, inspectAccounts, rotatePasswords,
} = require("./lib/password-rotation");

function parseArgs(args) {
  const result = { apply: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--apply" && !result.apply) result.apply = true;
    else if (["--expected-host", "--expected-db"].includes(args[i])) {
      const key = args[i] === "--expected-host" ? "host" : "database";
      if (result[key] || !args[i + 1] || args[i + 1].startsWith("--"))
        throw new Error("Argumentos inválidos");
      result[key] = args[++i];
    } else throw new Error("Solo se aceptan --apply, --expected-host y --expected-db; nunca claves en argumentos");
  }
  return result;
}

const POLICY_MESSAGE = "La nueva clave requiere al menos 12 caracteres y máximo 72 bytes UTF-8, sin controles. Vuelve a introducirla; no se ha iniciado la actualización.";
const GENERIC_FAILURE = "Operación no completada. Revisa destino, autorización, entrada privada y conectividad; detalles omitidos. Si hubo una interrupción al confirmar, verifica el estado antes de reintentar.";
function safeFailureMessage(error) {
  const messages = {
    PASSWORD_POLICY: POLICY_MESSAGE,
    PRIVATE_INPUT_CANCELLED: "Entrada privada cancelada o rechazada por contener controles o saltos de línea. No pegues varias líneas; ejecuta de nuevo el comando.",
    PRIVATE_TTY_REQUIRED: "Abre una terminal interactiva local y ejecuta el comando directamente, sin redirecciones ni tuberías.",
    AUTHORIZATION_MISMATCH: "La frase de autorización no coincide. No se inició la actualización; ejecuta de nuevo el comando y escribe la frase indicada.",
  };
  return Object.hasOwn(messages, error?.code) ? messages[error.code] : GENERIC_FAILURE;
}

async function collectPasswords({ read = readHidden, write = (message) => console.log(message), passwords = [] } = {}) {
  write("Entrada oculta: no aparecen letras ni asteriscos. Usa claves distintas, de al menos 12 caracteres y máximo 72 bytes UTF-8. Pulsa Enter al terminar cada entrada; Ctrl+C cancela.");
  for (const email of EMAILS) {
    let accepted = false;
    while (!accepted) {
      const entry = {};
      try {
        entry.password = validateNewPassword(await read(`Nueva clave para ${email} (oculta): `));
        if (passwords.includes(entry.password)) {
          write("Usa una clave distinta para cada cuenta. Vuelve a introducirla.");
          continue;
        }
        entry.confirmation = await read("Confirma la nueva clave (oculta): ");
        if (entry.password !== entry.confirmation) {
          write("La confirmación no coincide. Vuelve a introducir y confirmar la clave de esta cuenta.");
          continue;
        }
        passwords.push(entry.password);
        accepted = true;
      } catch (error) {
        if (error.code !== "PASSWORD_POLICY") throw error;
        write(POLICY_MESSAGE);
      } finally {
        entry.password = entry.confirmation = "";
      }
    }
  }
  return passwords;
}

async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.apply && (!process.stdin.isTTY || !process.stdout.isTTY))
    throw Object.assign(new Error("La aplicación requiere una terminal interactiva privada"), { code: "PRIVATE_TTY_REQUIRED" });
  const { client, target } = createMaintenanceClient(process.env.MONGO_URI);
  const passwords = [];
  try {
    if (options.apply) assertExpectedTarget(target, options);
    await client.connect();
    const db = client.db(target.database);
    await db.command({ ping: 1 });
    await inspectAccounts(db);
    console.log(JSON.stringify({ mode: "read-only", ...target, accounts: EMAILS, verified: true }));
    if (!options.apply) return;
    const phrase = `AUTORIZO ${target.host}/${target.database}`;
    const approval = await readHidden(`Para autorizar solo estas dos claves y revocar sus sesiones, escribe ${phrase}: `);
    if (approval !== phrase)
      throw Object.assign(new Error("Operación no autorizada"), { code: "AUTHORIZATION_MISMATCH" });
    await collectPasswords({ passwords });
    await rotatePasswords({ client, target, expected: options, approved: true, passwords });
    console.log("Se actualizaron únicamente las dos claves y se revocaron sus sesiones anteriores.");
  } finally {
    passwords.fill("");
    await client.close();
  }
}

if (require.main === module) {
  require("dotenv").config({ quiet: true, path: require("path").join(__dirname, "../.env") });
  main().catch((error) => {
    // Los errores del driver pueden contener URI, hashes u otros datos privados.
    console.error(safeFailureMessage(error));
    process.exitCode = 1;
  });
}
module.exports = { main, parseArgs, collectPasswords, safeFailureMessage };
