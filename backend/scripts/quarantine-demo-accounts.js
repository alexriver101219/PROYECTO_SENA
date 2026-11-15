const path = require("node:path");
const { createMaintenanceClient } = require("./lib/password-rotation");
const { quarantineDemoAccounts } = require("./lib/demo-quarantine");

async function main(args = process.argv.slice(2)) {
  const apply = args.includes("--apply");
  const approved = args.includes("--approved-disable-demo");
  if (args.some((arg) => !["--apply", "--approved-disable-demo"].includes(arg)))
    throw new Error("Argumentos inválidos");
  const { client, target } = createMaintenanceClient(process.env.MONGO_URI);
  try {
    await client.connect();
    await client.db(target.database).command({ ping: 1 });
    return await quarantineDemoAccounts({ client, target, apply, approved,
      expected: { host: "cluster1.nopuzfk.mongodb.net", database: "proyecto_sena" } });
  } finally { await client.close(); }
}
if (require.main === module) {
  require("dotenv").config({ quiet: true, path: path.join(__dirname, "../.env") });
  main().then((result) => console.log(JSON.stringify(result))).catch(() => {
    console.error("Operación no completada; detalles privados omitidos. Verifica el estado antes de reintentar.");
    process.exitCode = 1;
  });
}
module.exports = { main };
