const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Solicitud = require("../models/Solicitud");

// Consultar solicitudes
router.get("/", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json([]);
    }

    const solicitudes = await Solicitud.find();

    res.json(solicitudes);
  } catch (error) {
    res.status(500).json({
      msg: error.message,
    });
  }
});

// Crear solicitud
router.post("/", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(201).json({
        msg: "Solicitud registrada correctamente",
        solicitud: req.body,
      });
    }

    const solicitud = new Solicitud(req.body);

    await solicitud.save();

    res.status(201).json({
      msg: "Solicitud registrada correctamente",
      solicitud,
    });
  } catch (error) {
    res.status(500).json({
      msg: error.message,
    });
  }
});

// Actualizar solicitud
router.put("/:id", async (req, res) => {
  try {
    const solicitud = await Solicitud.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );

    res.json({
      msg: "Solicitud actualizada",
      solicitud,
    });
  } catch (error) {
    res.status(500).json({
      msg: error.message,
    });
  }
});

// Eliminar solicitud
router.delete("/:id", async (req, res) => {
  try {
    await Solicitud.findByIdAndDelete(req.params.id);

    res.json({
      msg: "Solicitud eliminada",
    });
  } catch (error) {
    res.status(500).json({
      msg: error.message,
    });
  }
});

module.exports = router;
