import { useState } from "react";
import api, { download, errorMessage } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useCollection } from "../hooks/useCollection";
import Pagination from "../components/Pagination";
import EmployeeRequestForm from "../components/EmployeeRequestForm";
import { formatDate, formatEmploymentDate } from "../utils/formatters";
export default function Solicitudes() {
  const auth = useAuth();
  const collection = useCollection("/solicitudes");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const action = async (handler) => {
    setBusy(true);
    setError("");
    try {
      await handler();
    } catch (error) {
      setError(error.response ? errorMessage(error) : error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Módulo de Solicitudes</h1>
        <p>Radica trámites y consulta su estado.</p>
      </div>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <EmployeeRequestForm onCreated={collection.refresh} />
      <section className="bg-white border rounded-xl p-5 space-y-3">
        <h2 className="text-lg font-bold">Historial de solicitudes</h2>
        {collection.error && (
          <p role="alert">
            {collection.error}{" "}
            <button onClick={collection.refresh}>Reintentar</button>
          </p>
        )}
        {collection.loading ? (
          <p role="status">Cargando solicitudes…</p>
        ) : (
          <ul className="divide-y">
            {collection.items.map((item) => (
              <li key={item.id} className="py-4 space-y-2">
                <div className="flex flex-wrap justify-between gap-3">
                  <strong>{item.tipo}</strong>
                  <span>
                    {item.estado}
                  </span>
                </div>
                <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 bg-slate-50 rounded-lg p-3 text-sm">
                  <div><dt className="text-slate-500">Solicitante</dt><dd className="font-medium">{item.empleado?.name || item.owner?.name || "Sin registrar"}</dd></div>
                  <div><dt className="text-slate-500">Documento de identidad</dt><dd>{item.empleado?.document || "Sin registrar"}</dd></div>
                  {item.empleado && <>
                    <div><dt className="text-slate-500">Cargo y área</dt><dd>{item.empleado.position} · {item.empleado.department}</dd></div>
                    <div><dt className="text-slate-500">Correo electrónico</dt><dd className="break-all">{item.empleado.email}</dd></div>
                  </>}
                  <div><dt className="text-slate-500">Fecha de solicitud</dt><dd>{item.fechaSolicitud ? formatEmploymentDate(item.fechaSolicitud) : item.createdAt ? formatDate(new Date(item.createdAt)) : "Sin registrar"}</dd></div>
                  <div><dt className="text-slate-500">Fecha solicitada para el permiso</dt><dd>{item.tipo === "Ajuste de nómina" ? "N/A — ajuste de nómina" : formatEmploymentDate(item.fechaPermiso)}</dd></div>
                </dl>
                <p className="whitespace-pre-wrap break-words">
                  {item.descripcion}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {item.documento && (
                    <button
                      disabled={busy}
                      className="text-blue-700"
                      onClick={() =>
                        action(() =>
                          download(
                            "/documentos/" + item.documento._id + "/download",
                            item.documento.nombre,
                          ),
                        )
                      }
                    >
                      Descargar soporte
                    </button>
                  )}
                  {auth?.user?.role === "admin" && (
                    <label>
                      Estado{" "}
                      <select
                        aria-label={"Estado de " + item.id}
                        value={item.estado}
                        disabled={busy}
                        onChange={(event) =>
                          action(async () => {
                            await api.put("/solicitudes/" + item.id, {
                              estado: event.target.value,
                            });
                            collection.refresh();
                          })
                        }
                      >
                        {["Pendiente", "Aprobado", "Rechazado"].map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  {(auth?.user?.role === "admin" ||
                    item.estado === "Pendiente") && (
                    <button
                      className="text-red-700"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm("¿Eliminar esta solicitud?"))
                          action(async () => {
                            await api.delete("/solicitudes/" + item.id);
                            collection.refresh();
                          });
                      }}
                    >
                      Eliminar solicitud
                    </button>
                  )}
                </div>
              </li>
            ))}
            {!collection.items.length && (
              <li>No hay solicitudes registradas.</li>
            )}
          </ul>
        )}
        <Pagination collection={collection} />
      </section>
    </main>
  );
}
