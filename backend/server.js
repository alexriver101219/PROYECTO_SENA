if (require.main === module)
  require("dotenv").config({
    quiet: true,
    path: require("path").join(__dirname, ".env"),
  });
const { createApp } = require("./app");
const { connectDB } = require("./config/db");
const { validateConfig } = require("./config/env");
async function start() {
  validateConfig();
  await connectDB();
  const server = createApp().listen(Number(process.env.PORT || 8000), () => {
    console.log("SESHA API disponible en el puerto", server.address().port);
  });
  server.on("error", (error) => {
    console.error("No se pudo iniciar la API:", error.code);
    process.exitCode = 1;
  });
  const shutdown = () =>
    server.close(async () => {
      await require("mongoose").disconnect();
      process.exitCode = 0;
    });
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
if (require.main === module)
  start().catch(() => {
    console.error("No se pudo iniciar la API. Revisa las variables y MongoDB.");
    process.exitCode = 1;
  });
module.exports = { start };
