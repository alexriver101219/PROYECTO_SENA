import React, { useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import InputField from '../components/InputField'
import Button from '../components/Button'

function Registro() {
  const { register } = useContext(AuthContext)
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden ❌')
      return
    }
    try {
      await register(formData.fullname, formData.email, formData.password)
      alert('Registro exitoso ✅')
    } catch (err) {
      setError('Error en el registro ❌')
    }
  }

  return (
    <main className="container mt-4">
      <section className="card p-4 shadow">
        <h2 className="mb-3">Crear cuenta</h2>
        <p>Completa los siguientes campos para registrarte en <strong>Mi App</strong>.</p>

        <form onSubmit={handleSubmit}>
          <InputField
            id="fullname"
            label="Nombre completo"
            placeholder="Tu nombre"
            value={formData.fullname}
            onChange={handleChange}
            required
          />

          <InputField
            id="email"
            type="email"
            label="Correo electrónico"
            placeholder="tu@correo.com"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <InputField
            id="password"
            type="password"
            label="Contraseña"
            placeholder="Mínimo 6 caracteres"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <InputField
            id="confirmPassword"
            type="password"
            label="Confirmar contraseña"
            placeholder="Repite tu contraseña"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />

          <Button type="submit" label="Registrarse" className="btn btn-success w-100" />
        </form>

        {error && <p className="text-danger mt-2">{error}</p>}

        <p className="small text-center mt-3">
          ¿Ya tienes cuenta? <a href="/login" className="link-primary">Inicia sesión aquí</a>
        </p>
      </section>
    </main>
  )
}

export default Registro
