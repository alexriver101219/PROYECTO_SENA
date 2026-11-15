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
      if (data.period !== period || ![data.gross, data.health, data.pension, data.deductions, data.net].every(Number.isSafeInteger)) {
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
        <p>Consulta el devengado, los descuentos de salud y pensión y tu total a pagar. Descarga el PDF con tus datos y el logo de SESHA.</p>
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <caption className="text-left text-slate-600 pb-2">Detalle mensual en pesos colombianos (COP)</caption>
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th scope="col" className="p-3 text-left">Concepto</th>
                  <th scope="col" className="p-3 text-right">Devengado</th>
                  <th scope="col" className="p-3 text-right">Deducciones</th>
                  <th scope="col" className="p-3 text-right">Total a pagar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="bg-slate-50">
                  <th scope="row" className="p-3 text-left font-medium">Salario mensual bruto</th>
                  <td className="p-3 text-right tabular-nums">{money(details.gross)}</td>
                  <td className="p-3 text-right">—</td><td className="p-3 text-right">—</td>
                </tr>
                <tr>
                  <th scope="row" className="p-3 text-left font-medium">Salud ({details.healthPercent} %)</th>
                  <td className="p-3 text-right">—</td>
                  <td className="p-3 text-right tabular-nums">{money(details.health)}</td><td className="p-3 text-right">—</td>
                </tr>
                <tr className="bg-slate-50">
                  <th scope="row" className="p-3 text-left font-medium">Pensión ({details.pensionPercent} %)</th>
                  <td className="p-3 text-right">—</td>
                  <td className="p-3 text-right tabular-nums">{money(details.pension)}</td><td className="p-3 text-right">—</td>
                </tr>
              </tbody>
              <tfoot className="bg-teal-700 text-white font-bold">
                <tr>
                  <th scope="row" className="p-3 text-left">Totales</th>
                  <td className="p-3 text-right tabular-nums">{money(details.gross)}</td>
                  <td className="p-3 text-right tabular-nums">{money(details.deductions)}</td>
                  <td className="p-3 text-right tabular-nums">{money(details.net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
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
