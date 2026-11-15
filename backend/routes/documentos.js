const router = require("express").Router();
const Documento = require("../models/Documento");
const Empleado = require("../models/Empleado");
const Solicitud = require("../models/Solicitud");
const {
  certificateDetails,
  employmentCertificate,
} = require("../services/employmentCertificate");
const { authenticate, scope } = require("../middlewares/authMiddleware");
const { upload, validatePDF } = require("../middlewares/upload");
const { asyncHandler, HttpError } = require("../utils/http");
const v = require("../utils/validation");
const { payslipDetails, payslipPDF } = require("../services/payslip");
router.use(authenticate);
async function payroll(req) {
  // Vercel añade el parámetro del rewrite /api/:path* a la consulta.
  // Solo se admite cuando coincide con la ruta que Express ya resolvió.
  v.fields(req.query, ["period", "path"]);
  if (req.query.path !== undefined && req.query.path !== "documentos" + req.path)
    throw new HttpError(400, "La ruta de consulta de nómina no coincide");
  const profile = await Empleado.findOne({ user: req.user._id });
  return payslipDetails(req.user, profile, req.query.period);
}
router.get("/nomina", asyncHandler(async (req, res) => {
  res.json(await payroll(req));
}));
router.get("/nomina/pdf", asyncHandler(async (req, res) => {
  const details = await payroll(req);
  const pdf = payslipPDF(details);
  res.type("application/pdf").attachment(`desprendible-nomina-${details.period}-${details.document}.pdf`);
  pdf.pipe(res);
  pdf.end();
}));
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
    if (!profile)
      throw new HttpError(
        409,
        "Solicita al administrador que complete tu perfil laboral",
      );
    const details = certificateDetails(req.user, profile);
    const pdf = employmentCertificate(details);
    const filename = "constancia-laboral-" + profile.document + ".pdf";
    res.type("application/pdf").attachment(filename);
    pdf.pipe(res);
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
    res.status(201).json(
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
