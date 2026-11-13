import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api, { errorMessage } from "../services/api";
import Servicios from "../components/Servicios";
import { getGreeting, formatDate } from "../utils/formatters";
export default function Dashboard() {
  const auth = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    api
      .get("/dashboard")
      .then(({ data }) => {
        if (active) {
          setMetrics(data);
          setError("");
        }
      })
      .catch((error) => {
        if (active) setError(errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [version]);
  const cards = [
    ["Documentos", metrics?.documentos],
    ["Solicitudes", metrics?.solicitudes],
    ["Pendientes", metrics?.pendientes],
    ...(auth?.user?.role === "admin"
      ? [["Personal activo", metrics?.empleados]]
      : []),
  ];
  const links = [
    ["/documentos", "Documentos", "Carga y descarga tus PDF."],
    ["/solicitudes", "Solicitudes", "Radica trámites y consulta su estado."],
    ...(auth?.user?.role === "admin"
      ? [["/empleados", "Empleados", "Administra los perfiles laborales."]]
      : []),
    ["/perfil", "Mi perfil", "Consulta tus datos registrados."],
  ];
  return (
    <main className="max-w-7xl mx-auto p-6 space-y-8">
      <section className="bg-white border rounded-xl p-6">
        <p className="text-blue-700 font-semibold">Panel principal</p>
        <h1 className="text-2xl font-bold">
          {getGreeting()}, {auth?.user?.name || "Usuario"}
        </h1>
        <p>{formatDate()}</p>
        <p className="text-sm text-slate-500">
          Gestión de personal, documentos y solicitudes
        </p>
      </section>
      {error && (
        <p role="alert">
          {error}{" "}
          <button onClick={() => setVersion((value) => value + 1)}>
            Reintentar
          </button>
        </p>
      )}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(([label, value]) => (
          <div key={label} className="bg-white border p-5 rounded-xl">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-3xl font-bold">{value ?? "—"}</p>
          </div>
        ))}
      </section>
      <section className="grid md:grid-cols-2 gap-4">
        {links.map(([to, label, description]) => (
          <Link
            key={to}
            to={to}
            className="bg-white border p-5 rounded-xl hover:border-blue-500"
          >
            <h2 className="font-bold text-lg">{label}</h2>
            <p>{description}</p>
          </Link>
        ))}
      </section>
      <section>
        <h2 className="font-bold text-xl mb-4">Servicios y cobertura</h2>
        <Servicios />
      </section>
    </main>
  );
}
