import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { downloadEmploymentCertificate, errorMessage } from "../services/api";
import { formatEmploymentDate } from "../utils/formatters";
export default function Perfil() {
  const auth = useAuth();
  const { refresh } = auth;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const certificate = async () => {
    setBusy(true);
    setError("");
    try {
      await downloadEmploymentCertificate();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="font-bold text-2xl">Mi perfil</h1>
      <section className="bg-white p-6 rounded-xl border space-y-3">
        <h2 className="text-xl font-bold">{auth.user?.name}</h2>
        <p>{auth.user?.email}</p>
        <p>
          Permisos: {auth.user?.role === "admin" ? "Administrador" : "Empleado"}
        </p>
        {auth.profile ? (
          <dl className="grid grid-cols-2 gap-3">
            {[
              ["Documento", auth.profile.document],
              ["Cargo", auth.profile.position],
              ["Departamento", auth.profile.department],
              ["Estado", auth.profile.status],
              ["Fecha de ingreso", formatEmploymentDate(auth.profile.hireDate)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-slate-500">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p>
            Tu cuenta todavía no tiene un perfil laboral vinculado. Solicita al
            administrador que lo registre.
          </p>
        )}
      </section>
      <section className="bg-white p-6 rounded-xl border space-y-3">
        <h2 className="font-bold text-lg">Constancia laboral</h2>
        <p>
          Se genera con tu nombre, documento, cargo y fecha de ingreso
          registrados, junto con la fecha actual de expedición.
        </p>
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
        <button
          disabled={busy || !auth.profile}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={certificate}
        >
          {busy ? "Generando…" : "Descargar constancia laboral"}
        </button>
      </section>
    </main>
  );
}
