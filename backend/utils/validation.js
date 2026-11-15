const mongoose = require("mongoose");
const { HttpError } = require("./http");
function fields(body, allowed) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new HttpError(400, "Cuerpo inválido");
  if (Object.keys(body).some((key) => !allowed.includes(key)))
    throw new HttpError(400, "Hay campos no permitidos");
}
function text(value, label, min = 1, max = 150) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw new HttpError(400, label + ": longitud inválida");
  return value.trim();
}
function email(value) {
  const normalized = text(value, "Correo", 5, 254).toLowerCase();
  if (!/^[a-z0-9.!#$%&'*+/=?^_\x60{|}~-]+@sesha\.com$/.test(normalized))
    throw new HttpError(400, "Usa un correo @sesha.com válido");
  return normalized;
}
function password(value) {
  if (
    typeof value !== "string" ||
    value.length < 6 ||
    Buffer.byteLength(value) > 72
  )
    throw new HttpError(
      400,
      "La contraseña debe tener al menos 6 caracteres y máximo 72 bytes",
    );
  return value;
}
function newPassword(value) {
  if (typeof value !== "string" || [...value].length < 12 ||
      Buffer.byteLength(value, "utf8") > 72 ||
      [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))
    throw new HttpError(400, "La nueva contraseña debe tener al menos 12 caracteres y máximo 72 bytes, sin caracteres de control");
  return value;
}
function id(value) {
  if (!mongoose.isObjectIdOrHexString(value))
    throw new HttpError(400, "Identificador inválido");
  return value;
}
function page(query) {
  const limit = Number(query.limit || 20),
    current = Number(query.page || 1);
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isInteger(current) ||
    current < 1 ||
    current > 10000
  )
    throw new HttpError(400, "Paginación inválida");
  return { limit, skip: (current - 1) * limit, page: current };
}
module.exports = { fields, text, email, password, newPassword, id, page };
