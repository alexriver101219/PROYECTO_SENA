const { HttpError } = require("./http");

function dateInBogota(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type) => parts.find((part) => part.type === type).value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function validDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(value + "T12:00:00Z");
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function hireDate(value, now = new Date()) {
  if (
    !validDateOnly(value) ||
    value < "1950-01-01" ||
    value > dateInBogota(now)
  ) {
    throw new HttpError(
      400,
      "La fecha de ingreso debe ser válida y no puede estar en el futuro",
    );
  }
  return value;
}

function longDate(value) {
  if (!validDateOnly(value))
    throw new HttpError(
      409,
      "El perfil laboral necesita una fecha de ingreso válida",
    );
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value + "T12:00:00Z"));
}

module.exports = { dateInBogota, validDateOnly, hireDate, longDate };
