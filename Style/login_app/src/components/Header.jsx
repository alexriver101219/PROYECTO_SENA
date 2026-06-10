import React, { useContext } from "react"
import { Link } from "react-router-dom"
import { AuthContext } from "../context/AuthContext"

function Header() {
  const { user, logout } = useContext(AuthContext)

  return (
    <header className="navbar navbar-expand-lg navbar-dark bg-dark px-3">
      <Link className="navbar-brand" to="/">LoginApp</Link>
      <nav className="navbar-nav ms-auto">
        {!user ? (
          <>
            <Link className="nav-link" to="/login">Login</Link>
            <Link className="nav-link" to="/register">Register</Link>
          </>
        ) : (
          <>
            <Link className="nav-link" to="/dashboard">Dashboard</Link>
            <Link className="nav-link" to="/empleados">Empleados</Link>
            <Link className="nav-link" to="/documentos">Documentos</Link>
            <Link className="nav-link" to="/solicitudes">Solicitudes</Link>
            <Link className="nav-link" to="/perfil">Perfil</Link>
            <button className="btn btn-outline-light ms-2" onClick={logout}>
              Logout
            </button>
          </>
        )}
      </nav>
    </header>
  )
}

export default Header
