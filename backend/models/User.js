const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

// Definición del esquema de usuario
const UserSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Formato de correo inválido']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
}, { timestamps: true })

// Middleware para encriptar contraseña antes de guardar
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (err) {
    next(err)
  }
})

// Método para comparar contraseñas en login
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

// Exportar modelo
module.exports = mongoose.model('User', UserSchema)
