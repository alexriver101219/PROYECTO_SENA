const jwt = require("jsonwebtoken");
const { cookieToken } = require("../services/session");
const User = require("../models/User");
const { asyncHandler, HttpError } = require("../utils/http");
const { id } = require("../utils/validation");
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.get("authorization") || "";
  const token = /^Bearer [^\s]+$/.test(header)
    ? header.slice(7)
    : cookieToken(req);
  if (!token) throw new HttpError(401, "Inicia sesión para continuar");
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "sesha-api",
      audience: "sesha-web",
    });
    id(payload.sub);
  } catch {
    throw new HttpError(401, "La sesión es inválida o expiró");
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.active || (payload.version || 0) !== user.sessionVersion)
    throw new HttpError(401, "La sesión ya no está activa");
  req.user = user;
  req.sessionToken = token;
  next();
});
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin")
    return next(new HttpError(403, "Esta operación requiere un administrador"));
  next();
};
const scope = (req) =>
  req.user.role === "admin" ? {} : { owner: req.user._id };
module.exports = { authenticate, adminOnly, scope };
