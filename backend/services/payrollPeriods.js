const { HttpError } = require("../utils/http");
const { dateInBogota } = require("../utils/dates");

function monthEnd(period) {
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function latestClosedFortnight(now = new Date()) {
  const today = dateInBogota(now), period = today.slice(0, 7), day = Number(today.slice(8));
  if (day >= monthEnd(period)) return { period, half: "2" };
  if (day >= 15) return { period, half: "1" };
  const [year, month] = period.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 7);
  return { period: previous, half: "2" };
}

function payrollPeriod(period, half, now = new Date()) {
  const today = dateInBogota(now), latest = latestClosedFortnight(now);
  const selected = period === undefined ? latest.period : period;
  if (typeof selected !== "string" || !/^20\d{2}-(0[1-9]|1[0-2])$/u.test(selected) || selected > today.slice(0, 7))
    throw new HttpError(400, "Selecciona un mes válido que no esté en el futuro");
  const selectedHalf = half === undefined ? (selected < today.slice(0, 7) ? "2" : latest.half) : half;
  if (!["1", "2"].includes(selectedHalf)) throw new HttpError(400, "Selecciona la primera o la segunda quincena");
  const start = `${selected}-${selectedHalf === "1" ? "01" : "16"}`;
  const end = `${selected}-${selectedHalf === "1" ? "15" : monthEnd(selected)}`;
  if (end > today) throw new HttpError(400, "La quincena seleccionada aún no ha terminado");
  const monthLabel = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", month: "long", year: "numeric" })
    .format(new Date(selected + "-01T12:00:00Z"));
  return { period: selected, half: selectedHalf, periodStart: start, periodEnd: end,
    periodLabel: `${selectedHalf === "1" ? "Primera" : "Segunda"} quincena de ${monthLabel}` };
}

module.exports = { payrollPeriod, latestClosedFortnight };
