const multer = require("multer");
const { HttpError } = require("../utils/http");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
  fileFilter: (_req, file, cb) =>
    cb(
      file.mimetype === "application/pdf"
        ? null
        : new HttpError(400, "Solo se admiten PDF"),
      file.mimetype === "application/pdf",
    ),
});
function validatePDF(file) {
  if (
    !file ||
    file.buffer.length < 8 ||
    file.buffer.subarray(0, 5).toString() !== "%PDF-" ||
    !file.buffer.subarray(-1024).includes(Buffer.from("%%EOF"))
  )
    throw new HttpError(400, "El archivo no es un PDF válido");
  return file;
}
module.exports = { upload, validatePDF };
