import React from 'react'
import { Link } from 'react-router-dom'

function Header() {
  return (
    <header className="navbar">
      <div className="navbar-brand">
        <h1>Mi App 🚀</h1>
      </div>
      <nav className="navbar-links">
        <Link to="/" className="nav-link">Inicio</Link>
        <Link to="/landing" className="nav-link">Landing</Link>
        <Link to="/register" className="nav-link">Registro</Link>
        <Link to="/login" className="nav-link">Login</Link>
        <Link to="/forgotpwd" className="nav-link">Recuperar Contraseña</Link>
      </nav>
    </header>
  )
}

export default Header
