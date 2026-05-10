// app.js
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const bcrypt = require('bcrypt')
const bodyParser = require('body-parser')

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(bodyParser.json())

// Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/miapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch(err => console.error('❌ Error al conectar MongoDB:', err))

// Modelo de Usuario
const UserSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
})

const User = mongoose.model('User', UserSchema)

// Ruta de registro
app.post('/register', async (req, res) => {
  try {
    const { fullname, email, password } = req.body
    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = new User({ fullname, email, password: hashedPassword })
    await newUser.save()
    res.status(201).json({ message: 'Usuario registrado correctamente ✅' })
  } catch (err) {
    res.status(400).json({ error: 'Error al registrar usuario ❌', details: err })
  }
})

// Ruta de login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado ❌' })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(401).json({ error: 'Contraseña incorrecta ❌' })

    res.json({ message: 'Login exitoso ✅', user })
  } catch (err) {
    res.status(500).json({ error: 'Error en login ❌', details: err })
  }
})

// Ruta de recuperación de contraseña
app.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    const user = await User.findOne({ email })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado ❌' })

    // Aquí podrías integrar Nodemailer para enviar un correo con enlace de recuperación
    res.json({ message: 'Se envió un enlace de recuperación al correo ✅' })
  } catch (err) {
    res.status(500).json({ error: 'Error en recuperación ❌', details: err })
  }
})

// Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
})
