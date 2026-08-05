const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const router = express.Router();
const User = require("../models/User");

const inMemoryUsers = new Map();

const buildDemoUsers = () => {
  const basePassword = "Sesha2026!";
  const names = [
    "Carlos Mendoza",
    "Laura Gómez",
    "Andrés Ramírez",
    "Sofía Torres",
    "Miguel Álvarez",
    "Valentina Ruiz",
    "Jorge Castillo",
    "Camila Pérez",
    "Daniel Soto",
    "Ana Morales",
    "Mateo Rojas",
    "Paula Jiménez",
    "Sebastián Herrera",
    "Mariana Cárdenas",
    "Nicolás Vega",
    "Isabella Díaz",
    "Tomás Quintero",
    "Elena Ríos",
    "Felipe Navarro",
    "Diana Salazar",
  ];

  return names.map((name) => {
    const normalizedName = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z\s]/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .join(".");

    return {
      name,
      email: `${normalizedName}@sesha.com`,
      password: bcrypt.hashSync(basePassword, 10),
      role: "employee",
    };
  });
};

const createToken = (user) =>
  jwt.sign(
    {
      id: user._id || user.id || user.email,
      email: user.email,
      name: user.name,
      role: user.role || "employee",
    },
    process.env.JWT_SECRET || "demo-secret",
    { expiresIn: "8h" },
  );

const seedDemoUsers = async () => {
  const demoUsers = buildDemoUsers();

  demoUsers.forEach((userData) => {
    if (!inMemoryUsers.has(userData.email)) {
      inMemoryUsers.set(userData.email, {
        id: userData.email,
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role,
      });
    }
  });

  if (mongoose.connection.readyState === 1) {
    for (const userData of demoUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        await User.create({
          name: userData.name,
          email: userData.email,
          password: userData.password,
        });
      }
    }
  }
};

const seedDemoUsersOnStartup = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return;
    }

    await seedDemoUsers();
  } catch (error) {
    console.error(
      "No se pudieron cargar los usuarios demo en MongoDB:",
      error.message,
    );
  }
};

// ======================
// REGISTER
// ======================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        msg: "Todos los campos son requeridos",
      });
    }

    if (!email.toLowerCase().endsWith("@sesha.com")) {
      return res.status(400).json({
        msg: "El dominio debe ser @sesha.com",
      });
    }

    const normalizedEmail = email.toLowerCase();
    const existingInMemory = inMemoryUsers.get(normalizedEmail);
    if (existingInMemory) {
      return res.status(400).json({
        msg: "El usuario ya existe",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: normalizedEmail,
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: "employee",
    };

    inMemoryUsers.set(normalizedEmail, newUser);

    if (mongoose.connection.readyState === 1) {
      try {
        await User.create({
          name,
          email: normalizedEmail,
          password: hashedPassword,
          role: "employee",
        });
      } catch (dbError) {
        if (dbError.code === 11000 || dbError.message?.includes("username")) {
          console.warn(
            "⚠️ Se detectó un índice legacy en users; se continúa con el registro en memoria.",
          );
        } else {
          throw dbError;
        }
      }
    }

    const token = createToken(newUser);

    res.status(201).json({
      success: true,
      msg: "Usuario registrado exitosamente 🚀",
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
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

    if (email === "admin@sesha.com" && password === "123456") {
      const token = createToken({ id: "demo-user", email });

      return res.status(200).json({
        success: true,
        message: "Login exitoso",
        token,
        user: {
          id: "demo-user",
          name: "Administrador demo",
          email,
        },
      });
    }

    await seedDemoUsers();

    const normalizedEmail = (email || "").toLowerCase();
    const user = inMemoryUsers.get(normalizedEmail);
    if (!user) {
      if (mongoose.connection.readyState === 1) {
        const persistedUser = await User.findOne({ email: normalizedEmail });
        if (!persistedUser) {
          return res.status(404).json({ msg: "Usuario no encontrado" });
        }

        const isMatch = await bcrypt.compare(password, persistedUser.password);
        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: "Contraseña incorrecta",
          });
        }

        const token = createToken(persistedUser);
        return res.status(200).json({
          success: true,
          message: "Login exitoso",
          token,
          user: {
            id: persistedUser._id,
            name: persistedUser.name,
            email: persistedUser.email,
          },
        });
      }

      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Contraseña incorrecta",
      });
    }

    const token = createToken(user);

    res.status(200).json({
      success: true,
      message: "Login exitoso",
      token,
      user: {
        id: user.id,
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
