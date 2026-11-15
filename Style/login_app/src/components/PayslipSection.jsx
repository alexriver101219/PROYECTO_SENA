import { useEffect, useState } from "react";
import api, { downloadPayslip, errorMessage } from "../services/api";
import { todayInBogota, formatEmploymentDate } from "../utils/formatters";
import { latestClosedFortnight, fortnightEnd } from "../utils/payrollPeriods";
import { useAuth } from "../hooks/useAuth";

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency", currency: "COP", maximumFractionDigits: 0,
});
const money = (amount) => currency.format(amount);

export default function PayslipSection() {
  const auth = useAuth();
  const isAdmin = auth?.user?.role === "admin";
  const today = todayInBogota();
  const latest = latestClosedFortnight(today);
  const [period, setPeriod] = useState(latest.period);
  const [half, setHalf] = useState(latest.half);
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
    if (fortnightEnd(period, half) > today) {
      setLoading(false); setError("La quincena seleccionada aún no ha terminado."); return;
    }
    setLoading(true);
    api.get(`/documentos/nomina?period=${encodeURIComponent(period)}&half=${half}`).then(({ data }) => {
      if (!active) return;
      if (data.period !== period || data.half !== half || ![data.monthlyNet, data.gross, data.health, data.pension, data.deductions, data.net].every(Number.isSafeInteger)) {
        setError("No se pudo consultar la liquidación. Intenta de nuevo.");
        return;
      }
      setDetails(data);
    }, (failure) => { if (active) setError(errorMessage(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period, half, today, attempt, isAdmin]);
  if (isAdmin) return null;
  const download = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await downloadPayslip(period, half);
      setNotice("Descarga del desprendible iniciada.");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally { setBusy(false); }
  };
  return (
    <section aria-labelledby="payroll-title" className="bg-white border rounded-xl p-5 space-y-4">
      <div>
        <h2 id="payroll-title" className="font-bold text-lg">Desprendible de nómina</h2>
        <p>Consulta una quincena finalizada y descarga tu comprobante con devengado, deducciones y total a pagar.</p>
      </div>
      <label className="block font-semibold" htmlFor="payroll-period">
        Período de nómina
        <input id="payroll-period" type="month" value={period} max={latest.period}
          min={auth?.profile?.hireDate?.slice(0, 7) || "2000-01"} disabled={busy}
          className="block mt-2 border rounded px-3 py-2" onChange={(event) => {
            const month = event.target.value; setPeriod(month);
            if (month) setHalf(fortnightEnd(month, "2") <= today ? "2" : "1");
          }} />
      </label>
      <label className="block font-semibold" htmlFor="payroll-half">
        Quincena
        <select id="payroll-half" value={half} disabled={busy || !period} onChange={(event) => setHalf(event.target.value)}
          className="block mt-2 border rounded px-3 py-2">
          <option value="1" disabled={fortnightEnd(period, "1") > today}>Primera quincena: días 1 al 15</option>
          <option value="2" disabled={fortnightEnd(period, "2") > today}>Segunda quincena: día 16 al final del mes</option>
        </select>
      </label>
      {loading && <p role="status">Consultando nómina…</p>}
      {!period && <p>Selecciona el mes que deseas consultar.</p>}
      {details && (
        <>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Asignación mensual neta</p>
            <p className="text-xl font-bold text-slate-900">{money(details.monthlyNet)}</p>
            <p className="text-sm text-slate-600">Del {formatEmploymentDate(details.periodStart)} al {formatEmploymentDate(details.periodEnd)}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <caption className="text-left text-slate-600 pb-2">Detalle quincenal en pesos colombianos (COP)</caption>
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
                  <th scope="row" className="p-3 text-left font-medium">Devengado de la quincena</th>
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
          <p><strong>Pago informado por SESHA:</strong> {details.payment.method} a la cuenta del empleado en {details.payment.bank}.</p>
          <p><strong>Programación {details.schedule.code}:</strong> {details.schedule.label}.</p>
          <p className="text-sm text-slate-600">{details.scopeNote}</p>
        </>
      )}
      {error && <div role="alert" className="text-red-700">
        <p>{error}</p>
        {!details && <button type="button" className="underline" disabled={loading || busy} onClick={() => setAttempt((value) => value + 1)}>Reintentar consulta de nómina</button>}
      </div>}
      {notice && <p role="status" className="text-green-700">{notice}</p>}
      <button type="button" disabled={!details || details.period !== period || details.half !== half || loading || busy} onClick={download}
        className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50">
        {busy ? "Generando desprendible…" : "Descargar desprendible de nómina"}
      </button>
    </section>
  );
}
