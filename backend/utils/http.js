class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message =
    status < 500 ? error.message : "No se pudo completar la operación";
  if (error.code === 11000) {
    status = 409;
    message = "El correo o documento ya está registrado";
  }
  if (error.name === "ValidationError" || error.name === "CastError") {
    status = 400;
    message = "Datos inválidos";
  }
  if (error.name === "MulterError") {
    status = 400;
    message = "Adjunta un único PDF de hasta 3 MB";
  }
  if (error.type === "entity.too.large") {
    status = 413;
    message = "El contenido supera el límite permitido";
  }
  if (error.type === "entity.parse.failed") {
    status = 400;
    message = "JSON inválido";
  }
  if (status >= 500 && process.env.NODE_ENV !== "test")
    console.error("Error API:", error.name, error.code || status);
  res.status(status).json({ success: false, message });
}
module.exports = { HttpError, asyncHandler, errorHandler };
