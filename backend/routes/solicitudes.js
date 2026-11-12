const router = require("express").Router();
const Solicitud = require("../models/Solicitud");
const Documento = require("../models/Documento");
const {
  authenticate,
  adminOnly,
  scope,
} = require("../middlewares/authMiddleware");
const { asyncHandler, HttpError } = require("../utils/http");
const v = require("../utils/validation");
router.use(authenticate);
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { limit, skip, page } = v.page(req.query),
      filter = scope(req);
    const [items, total] = await Promise.all([
      Solicitud.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate("documento", "nombre"),
      Solicitud.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  }),
);
router.post(
  "/",
  asyncHandler(async (req, res) => {
    v.fields(req.body, ["tipo", "descripcion", "documento"]);
    if (!["Permiso", "Vacaciones", "Certificado"].includes(req.body.tipo))
      throw new HttpError(400, "Tipo de solicitud inválido");
    const data = {
      owner: req.user._id,
      tipo: req.body.tipo,
      descripcion: v.text(req.body.descripcion, "Motivo", 3, 2000),
    };
    if (req.body.documento) {
      const document = await Documento.findOne({
        _id: v.id(req.body.documento),
        owner: req.user._id,
      });
      if (!document) throw new HttpError(404, "Soporte no encontrado");
      data.documento = document._id;
    }
    const solicitud = await Solicitud.create(data);
    res.status(201).json(await solicitud.populate("documento", "nombre"));
  }),
);
router.put(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    v.fields(req.body, ["estado"]);
    if (!["Pendiente", "Aprobado", "Rechazado"].includes(req.body.estado))
      throw new HttpError(400, "Estado inválido");
    const solicitud = await Solicitud.findByIdAndUpdate(
      v.id(req.params.id),
      { $set: { estado: req.body.estado } },
      { returnDocument: "after", runValidators: true },
    );
    if (!solicitud) throw new HttpError(404, "Solicitud no encontrada");
    res.json(solicitud);
  }),
);
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const filter = { _id: v.id(req.params.id), ...scope(req) };
    if (req.user.role !== "admin") filter.estado = "Pendiente";
    if (!(await Solicitud.findOneAndDelete(filter)))
      throw new HttpError(
        404,
        "No se encontró una solicitud que puedas eliminar",
      );
    res.status(204).end();
  }),
);
module.exports = router;
