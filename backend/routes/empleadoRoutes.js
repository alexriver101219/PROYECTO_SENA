const express = require("express");
const bcrypt = require("bcryptjs");
const Empleado = require("../models/Empleado"); // tu nuevo modelo
const router = express.Router();

// 📌 Registrar empleado
router.post("/register", async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    // Validación básica
    if (!nombre || !email || !password) {
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios" });
    }

    // Verificar si ya existe
    const empleadoExistente = await Empleado.findOne({ email });
    if (empleadoExistente) {
      return res
        .status(400)
        .json({ message: "El empleado ya está registrado" });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear nuevo empleado
    const nuevoEmpleado = new Empleado({
      nombre,
      email,
      password: hashedPassword,
    });

    await nuevoEmpleado.save();
    res.status(201).json({ message: "Empleado registrado exitosamente" });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

// 📌 Login empleado
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validación básica
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email y contraseña son obligatorios" });
    }

    // Buscar empleado
    const empleado = await Empleado.findOne({ email });
    if (!empleado) {
      return res.status(400).json({ message: "Credenciales inválidas" });
    }

    // Comparar contraseña
    const esValida = await bcrypt.compare(password, empleado.password);
    if (!esValida) {
      return res.status(400).json({ message: "Credenciales inválidas" });
    }

    // Aquí podrías generar un JWT si lo necesitas
    res.status(200).json({ message: "Login exitoso", empleado });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

module.exports = router;
