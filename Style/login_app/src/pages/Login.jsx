import React, { useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import InputField from '../components/InputField'
import Button from '../components/Button'

function Login() {
  const { login } = useContext(AuthContext)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await login(formData.email, formData.password)
      alert('Login exitoso ✅')
    } catch (err) {
      setError('Credenciales inválidas ❌')
    }
  }

const handleSubmit = async (e) => {
  e.preventDefault()
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    })

    const data = await res.json()

    if (res.ok) {
      alert('Login exitoso ✅')
      console.log(data)
    } else {
      alert(`Error en login ❌: ${data.error}`)
    }
  } catch (error) {
    console.error('Error en la petición:', error)
    alert('Error de conexión con el servidor ❌')
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

        <p className="small text-center mt-3">
          ¿No tienes cuenta? <a href="/register" className="link-primary">Regístrate aquí</a>
        </p>
        <p className="small text-center">
          ¿Olvidaste tu contraseña? <a href="/forgotpwd" className="link-secondary">Recupérala</a>
        </p>
      </section>
    </main>
  )
}

export default Login
