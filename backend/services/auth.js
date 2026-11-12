const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { HttpError } = require("../utils/http");
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
  if (await User.exists({ email: data.email }))
    throw new HttpError(409, "El usuario ya existe");
  const user = await User.create({
    ...data,
    password: await bcrypt.hash(data.password, 12),
    role: "employee",
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
module.exports = { register, login };
