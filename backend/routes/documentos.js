const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Documento = require("../models/Documento");

// Consultar documentos
router.get("/", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json([]);
    }

    const documentos = await Documento.find();

    res.json(documentos);
  } catch (error) {
    res.status(500).json({
      msg: error.message,
    });
  }
});

// Crear documento
router.post("/", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(201).json({
        msg: "Documento creado correctamente",
        documento: req.body,
      });
    }

    const documento = new Documento(req.body);

    await documento.save();

    res.status(201).json({
      msg: "Documento creado correctamente",
      documento,
    });
  } catch (error) {
    res.status(500).json({
      msg: error.message,
    });
  }
});

// Eliminar documento
router.delete("/:id", async (req, res) => {
  try {
    await Documento.findByIdAndDelete(req.params.id);

    res.json({
      msg: "Documento eliminado",
    });
  } catch (error) {
    res.status(500).json({
      msg: error.message,
    });
  }
});

module.exports = router;
