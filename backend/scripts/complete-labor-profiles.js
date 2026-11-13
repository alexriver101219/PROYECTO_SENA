if (require.main === module)
  require("dotenv").config({
    path: require("path").join(__dirname, "../.env"),
    quiet: true,
  });
const mongoose = require("mongoose");
const { connectDB } = require("../config/db");
const { completeLaborProfiles } = require("../services/laborProfiles");
async function main() {
  await connectDB();
  const apply = process.argv.includes("--apply");
  console.log(JSON.stringify(await completeLaborProfiles({ apply })));
  if (apply)
    console.log(JSON.stringify({ remaining: await completeLaborProfiles() }));
}
if (require.main === module)
  main()
    .catch((error) => {
      console.error(
        "No se completaron los perfiles:",
        error.name,
        error.code || "",
      );
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
module.exports = { main };
