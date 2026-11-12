const router = require("express").Router();
const Documento = require("../models/Documento");
const Empleado = require("../models/Empleado");
const Solicitud = require("../models/Solicitud");
const PDFDocument = require("pdfkit");
const { authenticate, scope } = require("../middlewares/authMiddleware");
const { upload, validatePDF } = require("../middlewares/upload");
const { asyncHandler, HttpError } = require("../utils/http");
const v = require("../utils/validation");
router.use(authenticate);
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { limit, skip, page } = v.page(req.query),
      filter = scope(req);
    const [items, total] = await Promise.all([
      Documento.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
      Documento.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  }),
);
router.get(
  "/certificado",
  asyncHandler(async (req, res) => {
    const profile = await Empleado.findOne({ user: req.user._id });
    if (!profile || profile.status !== "Activo")
      throw new HttpError(
        409,
        "Solicita al administrador que vincule tu perfil laboral activo",
      );
    const pdf = new PDFDocument({
      size: "A4",
      margin: 60,
      info: { Title: "Sesha - Constancia académica", Author: "Sesha" },
    });
    res.type("application/pdf").attachment("constancia-academica.pdf");
    pdf.pipe(res);
    pdf.fontSize(22).text("Sesha", { align: "center" });
    pdf
      .moveDown()
      .fontSize(16)
      .text("Constancia académica", { align: "center" });
    pdf
      .moveDown()
      .fontSize(12)
      .text(
        "En el proyecto académico figura " +
          profile.name +
          ", documento " +
          profile.document +
          ", con cargo " +
          profile.position +
          " en " +
          profile.department +
          ".",
      );
    pdf
      .moveDown()
      .text(
        "Fecha: " +
          new Date().toLocaleDateString("es-CO", {
            timeZone: "America/Bogota",
          }),
      );
    pdf
      .moveDown(2)
      .text(
        "Documento de demostración académica. No constituye certificación laboral oficial ni contiene firma digital.",
      );
    pdf.end();
  }),
);
router.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const file = validatePDF(req.file);
    const nombre =
      file.originalname
        .replace(/[^\p{L}\p{N} ._-]/gu, "_")
        .slice(0, 146)
        .replace(/\.pdf$/i, "") + ".pdf";
    res
      .status(201)
      .json(
        await Documento.create({
          owner: req.user._id,
          nombre,
          tipo: "application/pdf",
          size: file.size,
          data: file.buffer,
        }),
      );
  }),
);
router.get(
  "/:id/download",
  asyncHandler(async (req, res) => {
    const doc = await Documento.findOne({
      _id: v.id(req.params.id),
      ...scope(req),
    }).select("+data");
    if (!doc) throw new HttpError(404, "Documento no encontrado");
    if (!doc.data)
      throw new HttpError(
        410,
        "Este registro histórico no contiene un archivo. Solicita su revisión.",
      );
    res
      .set("Content-Security-Policy", "sandbox; default-src 'none'")
      .type("application/pdf")
      .attachment(doc.nombre)
      .send(doc.data);
  }),
);
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const doc = await Documento.findOne({
      _id: v.id(req.params.id),
      ...scope(req),
    });
    if (!doc) throw new HttpError(404, "Documento no encontrado");
    if (await Solicitud.exists({ documento: doc._id }))
      throw new HttpError(409, "El documento está asociado a una solicitud");
    await doc.deleteOne();
    res.status(204).end();
  }),
);
module.exports = router;
