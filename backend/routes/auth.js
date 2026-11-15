const { sendSession, csrfToken } = require("../services/session");
const User = require("../models/User");
const router = require("express").Router();
const service = require("../services/auth");
const Empleado = require("../models/Empleado");
const { authenticate } = require("../middlewares/authMiddleware");
const { asyncHandler, HttpError } = require("../utils/http");
const v = require("../utils/validation");
const laborPositions = require("../config/laborPositions");
const registrationEnabled = () => process.env.NODE_ENV !== "production";
router.get("/registration", (_req, res) => res.json({ enabled: registrationEnabled() }));
router.get("/positions", (_req, res) => res.json(laborPositions));
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    if (!registrationEnabled())
      throw new HttpError(403, "El registro público está cerrado. Solicita tu cuenta al administrador.");
    v.fields(req.body, ["name", "email", "password", "position"]);
    sendSession(
      res,
      await service.register({
        name: v.text(req.body.name, "Nombre", 3, 100),
        email: v.email(req.body.email),
        password: v.newPassword(req.body.password),
        position: req.body.position,
      }),
      201,
    );
  }),
);
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    v.fields(req.body, ["email", "password"]);
    sendSession(
      res,
      await service.login(
        v.email(req.body.email),
        v.password(req.body.password),
      ),
    );
  }),
);
router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({
      user: req.user,
      csrfToken: csrfToken(req.sessionToken),
      profile: await Empleado.findOne({ user: req.user._id }),
    });
  }),
);
router.post(
  "/change-password",
  asyncHandler(async (req, res) => {
    v.fields(req.body, ["email", "currentPassword", "newPassword", "confirmPassword"]);
    const email = v.email(req.body.email);
    const currentPassword = v.password(req.body.currentPassword);
    const newPassword = v.newPassword(req.body.newPassword);
    const confirmation = v.newPassword(req.body.confirmPassword);
    if (newPassword !== confirmation)
      throw new HttpError(400, "La confirmación de la nueva contraseña no coincide");
    await service.changePassword(email, currentPassword, newPassword);
    res.clearCookie("sesha_session", {
      path: "/api",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.json({ success: true, message: "Contraseña actualizada. Inicia sesión con tu nueva contraseña." });
  }),
);
router.post(
  "/logout",
  authenticate,
  asyncHandler(async (req, res) => {
    await User.updateOne(
      { _id: req.user._id },
      { $inc: { sessionVersion: 1 } },
    );
    res.clearCookie("sesha_session", {
      path: "/api",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.status(204).end();
  }),
);
module.exports = router;
