import React, { useState } from 'react'
import InputField from '../components/InputField'
import Button from '../components/Button'
import { Link } from 'react-router-dom'

function Register() {
  const [formData, setFormData] = useState({
    name: '',
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
    setError(null)

    try {
      if (formData.password !== formData.confirmPassword) {
        setError('Las contraseñas no coinciden ❌')
        return
      }
      // Aquí iría la lógica de registro (API, contexto, etc.)
      alert('Cuenta creada exitosamente ✅')
    } catch (err) {
      setError('Error al crear la cuenta ❌')
    }
  }

  return (
    <main className="container mt-4">
      <section className="card p-4 shadow">
        <h2 className="mb-3">Crear cuenta</h2>
        <p>Completa el formulario para registrarte.</p>

        <form onSubmit={handleSubmit}>
          <InputField
            id="name"
            type="text"
            label="Nombre completo"
            placeholder="Tu nombre"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <InputField
            id="email"
            type="email"
            label="Correo"
            placeholder="tu@correo.com"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <InputField
            id="password"
            type="password"
            label="Contraseña"
            placeholder="Tu contraseña"
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

          <Button type="submit" label="Crear cuenta" className="btn btn-primary w-100" />
        </form>

        {error && <p className="text-danger mt-2">{error}</p>}

        {/* 🔗 Enlace de navegación */}
        <p className="small text-center mt-3">
          ¿Ya tienes cuenta? <Link to="/login" className="link-primary">Inicia sesión</Link>
        </p>
      </section>
    </main>
  )
}

export default Register

