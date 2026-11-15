// Valores NETOS mensuales en COP indicados por el propietario de SESHA.
// Salud y pensión ya están descontadas; no se deducen otra vez.
// La programación describe el cargo; no sustituye registros de asistencia.
const rotating = { code: "2x2x2", label: "2 días diurnos de 12 h, 2 noches de 12 h y 2 días completos de descanso" };
const weekdays = { code: "L-V", label: "Lunes a viernes" };
const normalizePosition = (value) => String(value || "").normalize("NFD")
  .replace(/\p{M}/gu, "").trim().toLowerCase().replace(/\s+/gu, " ");
const amounts = [
  [2600000, rotating, ["Guarda de seguridad"]],
  [3200000, rotating, ["Supervisor", "Supervisora", "Supervisor de seguridad", "Supervisora de seguridad", "Supervisor de medios tecnológicos"]],
  [2800000, rotating, ["Guarda canino"]],
  [3200000, rotating, ["Escolta de mercancías"]],
  [3500000, rotating, ["Escolta VIP"]],
  [4500000, rotating, ["Coordinador de operaciones"]],
  [4600000, rotating, ["Coordinador de escoltas"]],
  [2900000, rotating, ["Operador de medios tecnológicos"]],
  [2000000, weekdays, ["Asistente administrativo", "Auxiliar de almacén", "Auxiliar de operaciones", "Analista de talento humano", "Personal administrativo"]],
  [2200000, weekdays, ["Técnico de medios tecnológicos", "Auxiliar de tecnología", "Técnico", "Técnica", "Personal técnico"]],
  [2500000, weekdays, ["Tecnólogo de medios tecnológicos", "Tecnólogo", "Tecnóloga", "Personal tecnólogo"]],
];
const netByPosition = new Map(amounts.flatMap(([net, schedule, positions]) =>
  positions.map((position) => [normalizePosition(position), { net, schedule }])));
const payrollForPosition = (position) => netByPosition.get(normalizePosition(position));

module.exports = { payrollForPosition };
