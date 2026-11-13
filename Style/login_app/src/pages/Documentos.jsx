import { useState } from "react";
import api, {
  download,
  downloadEmploymentCertificate,
  errorMessage,
  uploadPDF,
} from "../services/api";
import { useCollection } from "../hooks/useCollection";
import Pagination from "../components/Pagination";
export default function Documentos() {
  const collection = useCollection("/documentos");
  const [file, setFile] = useState(null);
  const [inputKey, setInputKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
      await uploadPDF(file);
      setFile(null);
      setInputKey((key) => key + 1);
      setSuccess("Documento guardado correctamente.");
      collection.refresh();
    });
  };
  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Módulo de Documentos</h1>
        <p>Consulta y conserva tus PDF. Máximo 3 MB por archivo.</p>
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
      <section className="bg-white border rounded-xl p-5 space-y-3">
        <h2 className="font-bold text-lg">Constancia laboral</h2>
        <p>
          Descarga tu constancia con nombre, documento, cargo, fecha de ingreso
          y fecha de expedición actual.
        </p>
        <button
          disabled={busy}
          className="bg-blue-600 text-white rounded px-4 py-2"
          onClick={() => action(downloadEmploymentCertificate)}
        >
          Descargar constancia laboral
        </button>
      </section>
      <form
        onSubmit={submit}
        className="bg-white border rounded-xl p-5 space-y-3"
      >
        <label className="block font-semibold">
          Adjuntar PDF
          <input
            key={inputKey}
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy}
            className="block mt-2 w-full p-2"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setError("");
            }}
          />
        </label>
        <button
          disabled={busy || !file}
          className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {busy ? "Procesando…" : "Guardar documento"}
        </button>
      </form>
      <section className="bg-white border rounded-xl p-5 space-y-3">
        <h2 className="font-bold text-lg">Documentos guardados</h2>
        {collection.error && (
          <p role="alert">
            {collection.error}{" "}
            <button onClick={collection.refresh}>Reintentar</button>
          </p>
        )}
        {collection.loading ? (
          <p role="status">Cargando documentos…</p>
        ) : (
          <ul className="divide-y">
            {collection.items.map((document) => (
              <li
                key={document.id}
                className="flex flex-wrap justify-between gap-3 py-3"
              >
                <span>
                  {document.nombre} ·{" "}
                  {document.size
                    ? Math.ceil(document.size / 1024) + " KB"
                    : "Registro sin archivo"}
                </span>
                <span className="flex gap-3">
                  <button
                    disabled={busy}
                    className="text-blue-700"
                    onClick={() =>
                      action(() =>
                        download(
                          "/documentos/" + document.id + "/download",
                          document.nombre,
                        ),
                      )
                    }
                  >
                    Descargar
                  </button>
                  <button
                    disabled={busy}
                    className="text-red-700"
                    onClick={() => {
                      if (window.confirm("¿Eliminar este documento?"))
                        action(async () => {
                          await api.delete("/documentos/" + document.id);
                          collection.refresh();
                        });
                    }}
                  >
                    Eliminar
                  </button>
                </span>
              </li>
            ))}
            {!collection.items.length && <li>No hay documentos guardados.</li>}
          </ul>
        )}
        <Pagination collection={collection} />
      </section>
    </main>
  );
}
