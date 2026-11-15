const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const mongoose = require("mongoose");
const { createDemoProfile } = require("./laborProfiles");
const { HttpError } = require("../utils/http");
const laborPositions = require("../config/laborPositions");
function session(user) {
  const token = jwt.sign(
    { version: user.sessionVersion || 0 },
    process.env.JWT_SECRET,
    {
      subject: String(user._id),
      algorithm: "HS256",
      expiresIn: "2h",
      issuer: "sesha-api",
      audience: "sesha-web",
    },
  );
  return { success: true, token, user: user.toJSON() };
}
async function register(data) {
  if (process.env.NODE_ENV === "production")
    throw new HttpError(403, "El registro público está cerrado. Solicita tu cuenta al administrador.");
  const { position, ...account } = data;
  const job = laborPositions.find((item) => item.position === position);
  if (position !== undefined && !job)
    throw new HttpError(400, "Selecciona un cargo válido");
  if (await User.exists({ email: data.email }))
    throw new HttpError(409, "El usuario ya existe");
  const password = await bcrypt.hash(data.password, 12);
  const user = await mongoose.connection.transaction(async (transaction) => {
    const [created] = await User.create(
      [{ ...account, password, role: "employee" }],
      { session: transaction },
    );
    await createDemoProfile(created, { session: transaction, job });
    return created;
  });
  return session(user);
}
const dummyHash = bcrypt.hashSync(
  "reference-credential-never-used-for-login",
  12,
);
async function login(email, password) {
  const user = await User.findOne({ email }).select("+password");
  const matches = await bcrypt.compare(password, user?.password || dummyHash);
  if (!user || !matches || !user.active)
    throw new HttpError(401, "Correo o contraseña incorrectos");
  return session(user);
}
async function changePassword(email, currentPassword, newPassword) {
  const user = await User.findOne({ email }).select("+password");
  const matches = await bcrypt.compare(currentPassword, user?.password || dummyHash);
  if (!user || !matches || !user.active)
    throw new HttpError(401, "Correo o contraseña actual incorrectos");
  if (await bcrypt.compare(newPassword, user.password))
    throw new HttpError(400, "La nueva contraseña debe ser diferente de la actual");
  const hash = await bcrypt.hash(newPassword, 12);
  // Una única escritura atómica: preserva roles y datos y detecta cambios concurrentes.
  const result = await User.updateOne(
    { _id: user._id, active: true, password: user.password },
    { $set: { password: hash }, $inc: { sessionVersion: 1 } },
    { runValidators: true, upsert: false, timestamps: false },
  );
  if (result.modifiedCount !== 1)
    throw new HttpError(409, "La cuenta cambió durante la operación. Vuelve a intentarlo");
}
module.exports = { register, login, changePassword };
