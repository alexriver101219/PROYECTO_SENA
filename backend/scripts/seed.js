if (require.main === module)
  require("dotenv").config({
    quiet: true,
    path: require("path").join(__dirname, "../.env"),
  });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { passwordFromEnv } = require("./lib/password-input");
const User = require("../models/User");
const Empleado = require("../models/Empleado");
const { connectDB } = require("../config/db");
const { validateConfig } = require("../config/env");
const {
  demoHireDate,
  completeLaborProfiles,
} = require("../services/laborProfiles");
async function seed() {
  validateConfig();
  const users = [
    {
      name: "Administrador",
      email: "admin@sesha.com",
      password: passwordFromEnv("SEED_ADMIN_PASSWORD"),
      role: "admin",
      document: "1000000001",
      position: "Administrador",
      department: "Tecnología",
    },
    {
      name: "Carlos Mendoza",
      email: "carlos.mendoza@sesha.com",
      password: passwordFromEnv("SEED_CARLOS_PASSWORD"),
      role: "employee",
      document: "1000000002",
      position: "Guarda de seguridad",
      department: "Operaciones",
    },
    {
      name: "Laura Gómez",
      email: "laura.gomez@sesha.com",
      password: passwordFromEnv("SEED_LAURA_PASSWORD"),
      role: "employee",
      document: "1000000003",
      position: "Supervisora",
      department: "Operaciones",
    },
  ];
  await connectDB();
  await Promise.all([User.createIndexes(), Empleado.createIndexes()]);
  for (const entry of users) {
    // No restablece contraseñas ni eleva permisos de cuentas existentes.
    let user = await User.findOne({ email: entry.email });
    if (!user)
      user = await User.create({
        name: entry.name,
        email: entry.email,
        password: await bcrypt.hash(entry.password, 12),
        role: entry.role,
      });
    if (entry.role === "admin" && user.role !== "admin")
      throw new Error(
        "El correo del administrador ya pertenece a otra cuenta; revisa manualmente sus permisos",
      );
    await Empleado.updateOne(
      { user: user._id },
      {
        $setOnInsert: {
          user: user._id,
          name: user.name,
          document: entry.document,
          position: entry.position,
          department: entry.department,
          status: "Activo",
          hireDate: demoHireDate(user._id),
        },
      },
      { upsert: true, runValidators: true },
    );
  }
  await completeLaborProfiles({ apply: true });
  console.log("Semilla completada; no se muestran credenciales.");
}
if (require.main === module)
  seed()
    .catch(() => {
      console.error("No se completó la semilla. Revisa configuración y conectividad; detalles omitidos.");
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
module.exports = { seed };
