import React, { useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import InputField from '../components/InputField'
import Button from '../components/Button'
import { Link } from 'react-router-dom'

function Login() {
  const auth = useContext(AuthContext)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    try {
      if (auth && auth.login) {
        await auth.login(formData.email, formData.password)
        alert('Login exitoso ✅')
      }
    } catch (err) {
      setError('Error al iniciar sesión ❌')
    }
  }

  return (
    <main className="container mt-4">
      <section className="card p-4 shadow">
        <h2 className="mb-3">Iniciar sesión</h2>
        <p>Accede a tu cuenta para continuar.</p>

        <form onSubmit={handleSubmit}>
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
            placeholder="Tu contraseña"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <Button type="submit" label="Entrar" className="btn btn-primary w-100" />
        </form>

        {error && <p className="text-danger mt-2">{error}</p>}

        {/* 🔗 Enlaces de navegación */}
        <p className="small text-center mt-3">
          ¿No tienes cuenta? <Link to="/register" className="link-primary">Regístrate aquí</Link>
        </p>
        <p className="small text-center">
          ¿Olvidaste tu contraseña? <Link to="/reset" className="link-secondary">Recupérala</Link>
        </p>
      </section>
    </main>
  )
}

export default Login
