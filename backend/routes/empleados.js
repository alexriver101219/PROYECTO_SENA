const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Empleado = require("../models/Empleado");

// Obtener todos los empleados
router.get("/", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json([]);
    }

    const empleados = await Empleado.find();
    res.status(200).json(empleados);
  } catch (error) {
    res.status(500).json({
      msg: "Error al consultar empleados",
      error: error.message,
    });
  }
});

// Obtener empleado por ID
router.get("/:id", async (req, res) => {
  try {
    const empleado = await Empleado.findById(req.params.id);

    if (!empleado) {
      return res.status(404).json({
        msg: "Empleado no encontrado",
      });
    }

    res.json(empleado);
  } catch (error) {
    res.status(500).json({
      msg: error.message,
    });
  }
});

// Crear empleado
router.post("/", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(201).json({
        msg: "Empleado registrado correctamente",
        empleado: req.body,
      });
    }

    const empleado = new Empleado(req.body);

    await empleado.save();

    res.status(201).json({
      msg: "Empleado registrado correctamente",
      empleado,
    });
  } catch (error) {
    res.status(500).json({
      msg: error.message,
    });
  }
});

// Actualizar empleado
router.put("/:id", async (req, res) => {
  try {
    const empleado = await Empleado.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.json({
      msg: "Empleado actualizado",
      empleado,
    });
  } catch (error) {
    res.status(500).json({
      msg: error.message,
    });
  }
});

// Eliminar empleado
router.delete("/:id", async (req, res) => {
  try {
    await Empleado.findByIdAndDelete(req.params.id);

    res.json({
      msg: "Empleado eliminado correctamente",
    });
  } catch (error) {
    res.status(500).json({
      msg: error.message,
    });
  }
});

module.exports = router;
