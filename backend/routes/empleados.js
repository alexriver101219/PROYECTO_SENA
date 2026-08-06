const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();

const Empleado = require("../models/Empleado");

// ==========================
// Middleware de autenticación
// ==========================
const verificarToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ msg: "Token requerido" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // guardar info del usuario en la request
    next();
  } catch (error) {
    return res.status(403).json({ msg: "Token inválido" });
  }
};

// ==========================
// Login empleado
// ==========================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const empleado = await Empleado.findOne({ email });
    if (!empleado) {
      return res
        .status(404)
        .json({ éxito: false, mensaje: "Usuario no encontrado" });
    }

    const esValida = await bcrypt.compare(password, empleado.password);
    if (!esValida) {
      return res
        .status(400)
        .json({ éxito: false, mensaje: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      {
        id: empleado._id,
        email: empleado.email,
        nombre: empleado.nombre || empleado.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    res.json({ éxito: true, mensaje: "Login exitoso", token });
  } catch (error) {
    res.status(500).json({
      éxito: false,
      mensaje: "Error en el servidor",
      error: error.message,
    });
  }
});

// ==========================
// CRUD de empleados
// ==========================

// Crear empleado
router.post("/", async (req, res) => {
  try {
    const { nombre, name, password } = req.body;
    const valorNombre = name || nombre || "Sin Nombre";

    // Encriptar solo si se proporciona contraseña (evita crash en bcrypt)
    let hash = password;
    if (password) {
      hash = await bcrypt.hash(password, 10);
    }

    // Fusionamos req.body para conservar campos obligatorios como rol, estado, telefono, etc.
    const nuevoEmpleado = new Empleado({
      ...req.body,
      name: valorNombre,
      nombre: valorNombre,
      password: hash,
    });

    await nuevoEmpleado.save();
    res.status(201).json(nuevoEmpleado);
  } catch (error) {
    console.error("🔴 Error en POST /api/empleados:", error.message);
    res
      .status(500)
      .json({ msg: "Error al crear empleado", error: error.message });
  }
});

// Obtener todos los empleados (protegido con token)
router.get("/", verificarToken, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json([]);
    }
    const empleados = await Empleado.find();
    res.status(200).json(empleados);
  } catch (error) {
    res
      .status(500)
      .json({ msg: "Error al consultar empleados", error: error.message });
  }
});

module.exports = router;
