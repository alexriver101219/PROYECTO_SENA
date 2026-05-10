const express = require('express')
const router = express.Router()
const User = require('../models/User')

//  Ruta de registro de usuarios
router.post('/', async (req, res) => {
  try {
    const { fullname, email, password } = req.body
    const newUser = new User({ fullname, email, password })
    await newUser.save()
    res.status(201).json({ message: 'Usuario creado correctamente ✅', user: newUser })
  } catch (err) {
    res.status(400).json({ error: 'Error al crear usuario ❌', details: err })
  }
})

// 📌 Obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const users = await User.find()
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios ❌', details: err })
  }
})

// 📌 Obtener usuario por ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado ❌' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuario ❌', details: err })
  }
})

// 📌 Actualizar usuario
router.put('/:id', async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!updatedUser) return res.status(404).json({ error: 'Usuario no encontrado ❌' })
    res.json({ message: 'Usuario actualizado ✅', user: updatedUser })
  } catch (err) {
    res.status(400).json({ error: 'Error al actualizar usuario ❌', details: err })
  }
})

// 📌 Eliminar usuario
router.delete('/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id)
    if (!deletedUser) return res.status(404).json({ error: 'Usuario no encontrado ❌' })
    res.json({ message: 'Usuario eliminado correctamente ✅' })
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar usuario ❌', details: err })
  }
})

const token =jwt.sign(
    {id:user._id},
    process.env.JWT_SECRECT,
    {expiresIn: "1h"}
);
try {
  res.json({
    message: "Login Exitoso",
  })
} catch (error) {
  res.status(500).json({ error: "Login errado " })
}



module.exports = router
