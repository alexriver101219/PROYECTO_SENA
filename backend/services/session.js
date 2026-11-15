const crypto = require("crypto");
const { HttpError } = require("../utils/http");
function cookieToken(req) {
  const part = (req.headers.cookie || "")
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith("sesha_session="));
  if (!part) return "";
  try {
    return decodeURIComponent(part.slice("sesha_session=".length));
  } catch {
    return "";
  }
}
const csrfToken = (token) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(token)
    .digest("hex");
function csrfProtection(req, _res, next) {
  // Estas rutas verifican credenciales explícitas, nunca autorizan por la cookie.
  if (["/auth/login", "/auth/register", "/auth/change-password"].includes(req.path)) return next();
  const token = cookieToken(req);
  if (!token || ["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const supplied = req.get("x-csrf-token") || "";
  const expected = csrfToken(token);
  if (
    !/^[a-f0-9]{64}$/.test(supplied) ||
    !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
    return next(new HttpError(403, "Actualiza la sesión antes de continuar"));
  next();
}
function sendSession(res, data, status = 200) {
  res.cookie("sesha_session", data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 2 * 60 * 60 * 1000,
    path: "/api",
  });
  res
    .status(status)
    .json({ success: true, user: data.user, csrfToken: csrfToken(data.token) });
}
module.exports = { cookieToken, csrfToken, csrfProtection, sendSession };
