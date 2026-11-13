const { sendSession, csrfToken } = require("../services/session");
const User = require("../models/User");
const router = require("express").Router();
const service = require("../services/auth");
const Empleado = require("../models/Empleado");
const { authenticate } = require("../middlewares/authMiddleware");
const { asyncHandler } = require("../utils/http");
const v = require("../utils/validation");
const laborPositions = require("../config/laborPositions");
router.get("/positions", (_req, res) => res.json(laborPositions));
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    v.fields(req.body, ["name", "email", "password", "position"]);
    sendSession(
      res,
      await service.register({
        name: v.text(req.body.name, "Nombre", 3, 100),
        email: v.email(req.body.email),
        password: v.password(req.body.password),
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
