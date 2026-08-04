const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const router = express.Router();
const User = require("../models/User");

// ======================
// REGISTER
// ======================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // validar
    if (!name || !email || !password) {
      return res.status(400).json({
        msg: "Todos los campos son requeridos",
      });
    }

    // verificar usuario
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        msg: "El usuario ya existe",
      });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({
      msg: "Usuario registrado exitosamente 🚀",
    });
  } catch (err) {
    res.status(500).json({
      msg: "Error en el registro",
      error: err.message,
    });
  }
});

// ======================
// LOGIN
// ======================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (mongoose.connection.readyState !== 1) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Contraseña incorrecta",
      });
    }

    // Generar JWT
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h",
      },
    );

    res.status(200).json({
      success: true,
      message: "Login exitoso",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({
      msg: "Error en el login",
      error: err.message,
    });
  }
});

module.exports = router;
