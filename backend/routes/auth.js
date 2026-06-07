const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const router = express.Router();

// 📌 Modelo de usuario
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model("User", UserSchema);

// 📌 Registro de usuario
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validación básica
    if (!username || !password) {
      return res.status(400).json({ msg: "Usuario y contraseña requeridos" });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ msg: "Usuario registrado exitosamente 🚀" });
  } catch (err) {
    res.status(500).json({ msg: "Error en el registro", error: err.message });
  }
});

// 📌 Login de usuario
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Buscar usuario
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    // Comparar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ msg: "Contraseña incorrecta" });
    }

    res.status(200).json({ msg: "Login exitoso ✅" });
  } catch (err) {
    res.status(500).json({ msg: "Error en el login", error: err.message });
  }
});

module.exports = router;
