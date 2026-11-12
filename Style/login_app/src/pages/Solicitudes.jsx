import { useState } from "react";
import api, { download, errorMessage, uploadPDF } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useCollection } from "../hooks/useCollection";
import Pagination from "../components/Pagination";
export default function Solicitudes() {
  const auth = useAuth();
  const collection = useCollection("/solicitudes");
  const [tipo, setTipo] = useState("Permiso");
  const [motivo, setMotivo] = useState("");
  const [file, setFile] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [inputKey, setInputKey] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const action = async (handler) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await handler();
    } catch (error) {
      setError(error.response ? errorMessage(error) : error.message);
    } finally {
      setBusy(false);
    }
  };
  const submit = (event) => {
    event.preventDefault();
    action(async () => {
      let attachment = documentId;
      if (file && !attachment) {
        attachment = (await uploadPDF(file)).id;
        setDocumentId(attachment);
      }
      await api.post("/solicitudes", {
        tipo,
        descripcion: motivo,
        ...(attachment ? { documento: attachment } : {}),
      });
      setMotivo("");
      setFile(null);
      setDocumentId(null);
      setInputKey((key) => key + 1);
      setSuccess("Solicitud radicada y guardada.");
      collection.refresh();
    });
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
      {success && (
        <p role="status" className="text-green-700">
          {success}
        </p>
      )}
      <form
        onSubmit={submit}
        className="bg-white border rounded-xl p-5 space-y-4"
      >
        <label className="block">
          Tipo de solicitud
          <select
            className="block w-full p-2 mt-1"
            value={tipo}
            disabled={busy}
            onChange={(event) => setTipo(event.target.value)}
          >
            {["Permiso", "Vacaciones", "Certificado"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="block">
          Motivo
          <textarea
            required
            minLength={3}
            maxLength={2000}
            rows={4}
            className="block w-full p-2 mt-1"
            value={motivo}
            disabled={busy}
            onChange={(event) => setMotivo(event.target.value)}
          />
        </label>
        <label className="block">
          Soporte PDF opcional (máximo 3 MB)
          <input
            key={inputKey}
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy}
            className="block w-full p-2 mt-1"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setDocumentId(null);
            }}
          />
        </label>
        {documentId && (
          <p className="text-sm">
            El soporte ya se guardó; se reutilizará al reintentar.
          </p>
        )}
        <button
          disabled={busy}
          className="bg-blue-600 text-white rounded px-4 py-2"
        >
          {busy ? "Guardando…" : "Enviar solicitud"}
        </button>
      </form>
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
                    {new Date(item.createdAt).toLocaleDateString("es-CO", {
                      timeZone: "America/Bogota",
                    })}{" "}
                    · {item.estado}
                  </span>
                </div>
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
