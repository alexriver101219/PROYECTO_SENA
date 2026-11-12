import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { errorMessage } from "../services/api";
export default function Header() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const logout = async () => {
    setBusy(true);
    try {
      await auth.logout();
      navigate("/login");
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <header className="border-b bg-slate-900 text-white px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4 justify-between">
        <Link to="/dashboard" className="font-bold text-xl">
          SESHA APP
        </Link>
        <nav
          className="flex flex-wrap items-center gap-4 text-sm"
          aria-label="Navegación principal"
        >
          <Link to="/dashboard">Panel</Link>
          <Link to="/documentos">Documentos</Link>
          <Link to="/solicitudes">Solicitudes</Link>
          {auth?.user?.role === "admin" && (
            <Link to="/empleados">Empleados</Link>
          )}
          <Link to="/perfil">Mi perfil</Link>
          <button
            disabled={busy}
            onClick={logout}
            className="rounded border px-3 py-1"
          >
            {busy ? "Saliendo…" : "Cerrar sesión"}
          </button>
        </nav>
      </div>
      {error && <p role="alert">{error}</p>}
    </header>
  );
}
