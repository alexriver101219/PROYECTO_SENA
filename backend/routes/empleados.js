const router = require("express").Router();
const Empleado = require("../models/Empleado");
const User = require("../models/User");
const { authenticate, adminOnly } = require("../middlewares/authMiddleware");
const { asyncHandler, HttpError } = require("../utils/http");
const v = require("../utils/validation");
const { hireDate } = require("../utils/dates");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
router.use(authenticate, adminOnly);
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { limit, skip, page } = v.page(req.query);
    const [items, total] = await Promise.all([
      Empleado.find()
        .populate("user", "email")
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
      Empleado.countDocuments(),
    ]);
    res.json({ items, total, page, limit });
  }),
);
async function employee(body) {
  v.fields(body, [
    "name",
    "document",
    "position",
    "department",
    "status",
    "email",
    "hireDate",
  ]);
  const data = {
    name: v.text(body.name, "Nombre", 3, 100),
    document: v.text(body.document, "Documento", 7, 10),
    position: v.text(body.position, "Cargo", 2, 100),
    department: v.text(body.department, "Departamento", 2, 100),
    status: body.status || "Activo",
  };
  if (body.hireDate !== undefined) data.hireDate = hireDate(body.hireDate);
  if (
    !/^\d{7,10}$/.test(data.document) ||
    !["Activo", "Inactivo"].includes(data.status)
  )
    throw new HttpError(400, "Documento o estado inválido");
  if (body.email) {
    const user = await User.findOne({ email: v.email(body.email) });
    if (!user)
      throw new HttpError(400, "Primero registra la cuenta del empleado");
    data.user = user._id;
  }
  return data;
}
router.post(
  "/",
  asyncHandler(async (req, res) => {
    let created;
    if (Object.hasOwn(req.body || {}, "initialPassword")) {
      const { initialPassword, ...body } = req.body;
      const password = await bcrypt.hash(v.newPassword(initialPassword), 12);
      const email = v.email(body.email);
      const data = await employee({ ...body, email: "" });
      if (!body.hireDate) throw new HttpError(400, "Indica la fecha de ingreso verificada");
      created = await mongoose.connection.transaction(async (session) => {
        const [user] = await User.create([{ name: data.name, email, password, role: "employee" }], { session });
        const [profile] = await Empleado.create([{ ...data, user: user._id }], { session });
        return profile;
      });
    } else created = await Empleado.create(await employee(req.body));
    res.status(201).json(await created.populate("user", "email"));
  }),
);
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const updated = await Empleado.findByIdAndUpdate(
      v.id(req.params.id),
      { $set: await employee(req.body) },
      { returnDocument: "after", runValidators: true },
    );
    if (!updated) throw new HttpError(404, "Empleado no encontrado");
    res.json(await updated.populate("user", "email"));
  }),
);
module.exports = router;
