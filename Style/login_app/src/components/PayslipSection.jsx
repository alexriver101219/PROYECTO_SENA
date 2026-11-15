import { useEffect, useState } from "react";
import api, { downloadPayslip, errorMessage } from "../services/api";
import { todayInBogota } from "../utils/formatters";
import { useAuth } from "../hooks/useAuth";

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency", currency: "COP", maximumFractionDigits: 0,
});
const money = (amount) => currency.format(amount);

export default function PayslipSection() {
  const auth = useAuth();
  const isAdmin = auth?.user?.role === "admin";
  const currentMonth = todayInBogota().slice(0, 7);
  const [period, setPeriod] = useState(currentMonth);
  const [attempt, setAttempt] = useState(0);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (isAdmin) return;
    let active = true;
    setDetails(null);
    setError("");
    setNotice("");
    if (!period) { setLoading(false); return; }
    setLoading(true);
    api.get(`/documentos/nomina?period=${encodeURIComponent(period)}`).then(({ data }) => {
      if (!active) return;
      if (data.period !== period || !Number.isSafeInteger(data.net)) {
        setError("No se pudo consultar la liquidación. Intenta de nuevo.");
        return;
      }
      setDetails(data);
    }, (failure) => { if (active) setError(errorMessage(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period, attempt, isAdmin]);
  if (isAdmin) return null;
  const download = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await downloadPayslip(period);
      setNotice("Descarga del desprendible iniciada.");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally { setBusy(false); }
  };
  return (
    <section aria-labelledby="payroll-title" className="bg-white border rounded-xl p-5 space-y-4">
      <div>
        <h2 id="payroll-title" className="font-bold text-lg">Desprendible de nómina</h2>
        <p>Consulta tu valor neto mensual y descarga el PDF con tus datos y el logo de SESHA.</p>
      </div>
      <label className="block font-semibold" htmlFor="payroll-period">
        Período de nómina
        <input id="payroll-period" type="month" value={period} max={currentMonth}
          min={auth?.profile?.hireDate?.slice(0, 7) || "2000-01"} disabled={busy}
          className="block mt-2 border rounded px-3 py-2" onChange={(event) => setPeriod(event.target.value)} />
      </label>
      {loading && <p role="status">Consultando nómina…</p>}
      {!period && <p>Selecciona el mes que deseas consultar.</p>}
      {details && (
        <>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-sm text-slate-600">Valor neto mensual</dt>
              <dd className="text-2xl font-semibold text-slate-900">{money(details.net)}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-sm text-slate-600">Descuentos</dt>
              <dd className="font-semibold text-slate-900">{details.deductionStatus}</dd>
            </div>
          </dl>
          <p><strong>Programación {details.schedule.code}:</strong> {details.schedule.label}.</p>
          <p className="text-sm text-slate-600">{details.scopeNote}</p>
        </>
      )}
      {error && <div role="alert" className="text-red-700">
        <p>{error}</p>
        {!details && <button type="button" className="underline" disabled={loading || busy} onClick={() => setAttempt((value) => value + 1)}>Reintentar consulta de nómina</button>}
      </div>}
      {notice && <p role="status" className="text-green-700">{notice}</p>}
      <button type="button" disabled={!details || details.period !== period || loading || busy} onClick={download}
        className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50">
        {busy ? "Generando desprendible…" : "Descargar desprendible de nómina"}
      </button>
    </section>
  );
}
