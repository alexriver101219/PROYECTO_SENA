import React, { useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import InputField from '../components/InputField'
import Button from '../components/Button'
import { Link } from 'react-router-dom'
import { useNavigate } from "react-router-dom";

function Login() {
  const auth = useContext(AuthContext)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

 const handleSubmit = async (e) => {
  e.preventDefault();

  console.log("Entró al submit");

  setError(null);

  try {
    console.log("Llamando auth.login...");

    await auth.login(formData.email, formData.password);

    console.log("Login correcto");

    navigate("/dashboard");

  } catch (err) {
    console.log(err);

    setError(
      err.response?.data?.message ||
      err.response?.data?.msg ||
      "Correo o contraseña incorrectos"
    );
  }
};

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
