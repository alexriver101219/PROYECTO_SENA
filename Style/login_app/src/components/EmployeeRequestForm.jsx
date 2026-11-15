import { useEffect, useRef, useState } from "react";
import api, { errorMessage, uploadPDF } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import logo from "../assets/Sesha_logo.png";

export default function EmployeeRequestForm({ onCreated }) {
  const auth = useAuth();
  const isAdmin = auth?.user?.role === "admin";
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [tipo, setTipo] = useState("Día de la familia");
  const [fechaPermiso, setFechaPermiso] = useState("");
  const [motivo, setMotivo] = useState("");
  const [file, setFile] = useState(null);
  const [attachmentId, setAttachmentId] = useState(null);
  const [inputKey, setInputKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const submitting = useRef(false);
  const payroll = tipo === "Ajuste de nómina";
  useEffect(() => {
    if (isAdmin) return;
    let active = true;
    setLoading(true); setError("");
    api.get("/solicitudes/formulario").then(({ data }) => {
      if (!active) return;
      if (!data.employee?.document || !data.requestDate || !Array.isArray(data.types))
        throw new Error("No se pudieron cargar los datos del solicitante");
      setContext(data);
    }).catch((failure) => { if (active) setError(failure.response ? errorMessage(failure) : failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isAdmin, attempt]);
  if (isAdmin) return null;
  const submit = async (event) => {
    event.preventDefault();
    if (submitting.current || !context) return;
    submitting.current = true; setBusy(true); setError(""); setSuccess("");
    try {
      let documentId = attachmentId;
      if (file && !documentId) {
        const uploaded = await uploadPDF(file);
        if (!uploaded?.id) throw new Error("No se pudo confirmar el soporte adjunto");
        documentId = uploaded.id; setAttachmentId(documentId);
      }
      const { data } = await api.post("/solicitudes", {
        tipo, descripcion: motivo, fechaPermiso: payroll ? null : fechaPermiso,
        ...(documentId ? { documento: documentId } : {}),
      });
      if (!data?.id) throw new Error("No se pudo confirmar la radicación. Consulta tu historial antes de reintentar.");
      setMotivo(""); setFechaPermiso(""); setFile(null); setAttachmentId(null);
      setInputKey((value) => value + 1);
      if (data.fechaSolicitud) setContext((current) => ({ ...current, requestDate: data.fechaSolicitud }));
      setSuccess("Solicitud radicada y guardada. Puedes consultar su estado en Solicitudes.");
      onCreated?.(data);
    } catch (failure) {
      setError(failure.response ? errorMessage(failure) : failure.message);
    } finally { submitting.current = false; setBusy(false); }
  };
  return (
    <section aria-labelledby="employee-request-heading" className="bg-white border rounded-xl overflow-hidden">
      <div className="bg-slate-800 text-white p-5 flex items-center gap-4">
        <img src={logo} alt="SESHA" className="w-12 h-14 object-contain" />
        <div>
          <p className="text-xs uppercase tracking-widest text-teal-200">Gestión de personal</p>
          <h2 id="employee-request-heading" className="font-bold text-lg">Solicitud de permiso o ajuste de nómina</h2>
          <p className="text-sm text-slate-200">Completa el formato para revisión del administrador.</p>
        </div>
      </div>
      <form aria-label="Formato de solicitud del empleado" onSubmit={submit} className="p-5 space-y-5">
        {loading && <p role="status">Cargando datos del solicitante…</p>}
        {error && <div role="alert" className="text-red-700"><p>{error}</p>
          {!context && <button type="button" disabled={loading} className="underline" onClick={() => setAttempt((value) => value + 1)}>Reintentar datos del solicitante</button>}
        </div>}
        {success && <p role="status" className="text-green-700">{success}</p>}
        <fieldset disabled={busy || loading || !context} className="space-y-4">
          <legend className="font-semibold mb-3">Datos del solicitante</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ["Nombre completo", "name"], ["Documento de identidad", "document"], ["Correo electrónico", "email"],
              ["Cargo", "position"], ["Área o departamento", "department"],
            ].map(([label, key]) => <label key={key} className="block text-sm font-medium">
              {label}<input type="text" readOnly value={context?.employee[key] || ""} className="block w-full mt-1 border rounded-lg p-2.5 bg-slate-50 text-slate-700" />
            </label>)}
            <label className="block text-sm font-medium">Fecha de solicitud
              <input type="date" readOnly value={context?.requestDate || ""} className="block w-full mt-1 border rounded-lg p-2.5 bg-slate-50" />
            </label>
          </div>
          <p className="text-sm text-slate-500">Tus datos se completan desde tu perfil. Solicita su corrección al administrador si es necesario.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
            <label className="block text-sm font-medium">Tipo de solicitud
              <select value={tipo} onChange={(event) => setTipo(event.target.value)} className="block w-full mt-1 border rounded-lg p-2.5">
                {(context?.types || ["Día de la familia"]).map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">Fecha solicitada para el permiso
              {payroll ? <select defaultValue="na" className="block w-full mt-1 border rounded-lg p-2.5 bg-slate-50"><option value="na">N/A — no aplica para ajuste de nómina</option></select>
                : <input type="date" required min={context?.requestDate} value={fechaPermiso} onChange={(event) => setFechaPermiso(event.target.value)} className="block w-full mt-1 border rounded-lg p-2.5" />}
            </label>
          </div>
          <label className="block text-sm font-medium">Motivo
            <textarea required minLength={3} maxLength={2000} rows={4} value={motivo} onChange={(event) => setMotivo(event.target.value)}
              placeholder="Describe tu solicitud y los detalles que debe revisar el administrador." className="block w-full mt-1 border rounded-lg p-3" />
          </label>
          <label className="block text-sm font-medium">Soporte PDF opcional (máximo 3 MB)
            <input key={inputKey} type="file" accept="application/pdf,.pdf" className="block w-full mt-2 border rounded-lg p-2"
              onChange={(event) => { setFile(event.target.files?.[0] || null); setAttachmentId(null); }} />
          </label>
          <p className="text-sm text-slate-500">Usa Examinar para adjuntar un soporte cuando la solicitud lo requiera.</p>
          {attachmentId && <p className="text-sm text-slate-600">El soporte ya está guardado y se reutilizará al reintentar.</p>}
          <button type="submit" disabled={busy || loading || !context} className="bg-blue-600 text-white rounded-lg px-5 py-2.5 font-semibold disabled:opacity-50">
            {busy ? "Guardando solicitud…" : "Enviar solicitud"}
          </button>
        </fieldset>
        <a href="/solicitudes" className="inline-block text-sm text-blue-700 underline">Consultar el estado de mis solicitudes</a>
      </form>
    </section>
  );
}
