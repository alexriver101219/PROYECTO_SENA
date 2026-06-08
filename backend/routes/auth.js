const express = require("express");
const bcrypt = require("bcryptjs");

const router = express.Router();
const User = require("../models/user");

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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ msg: "Contraseña incorrecta" });
    }

    res.json({ msg: "Login exitoso ✅" });

  } catch (err) {
    res.status(500).json({
      msg: "Error en login",
      error: err.message,
    });
  }
});

module.exports = router;