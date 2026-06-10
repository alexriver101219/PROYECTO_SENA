import { Link } from "react-router-dom"

function Landing() {
  return (
    <main className="landing-container">
      <section className="card p-5 shadow text-center">
        <h1 className="mb-3">Bienvenido a SESHA</h1>
        <p className="mb-4">
          Plataforma de gestión integral. Tu ruta segura con React + Vite.
        </p>

        <div className="d-flex justify-content-center gap-3">
          <Link to="/login" className="btn btn-primary btn-lg">
            Iniciar Sesión
          </Link>
          <Link to="/register" className="btn btn-outline-primary btn-lg">
            Registrarse
          </Link>
        </div>
      </section>
    </main>
  )
}

export default Landing
