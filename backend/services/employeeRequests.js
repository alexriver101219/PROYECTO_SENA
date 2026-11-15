const { HttpError } = require("../utils/http");
const { dateInBogota, validDateOnly } = require("../utils/dates");
const { employeeRequestTypes } = require("../config/requestTypes");

function employeeRequestContext(user, profile, now = new Date()) {
  if (user.role !== "employee") throw new HttpError(403, "Este formulario está disponible para empleados");
  if (!profile || String(profile.user) !== String(user._id) || profile.status !== "Activo")
    throw new HttpError(409, "Solicita al administrador que complete y active tu perfil laboral");
  return {
    employee: { name: user.name, document: profile.document, email: user.email, position: profile.position, department: profile.department },
    requestDate: dateInBogota(now), types: employeeRequestTypes,
  };
}

function employeeRequestData(user, profile, body, now = new Date()) {
  const context = employeeRequestContext(user, profile, now);
  if (!employeeRequestTypes.includes(body.tipo)) throw new HttpError(400, "Tipo de solicitud inválido");
  const payroll = body.tipo === "Ajuste de nómina";
  if (payroll) {
    if (body.fechaPermiso !== undefined && body.fechaPermiso !== null)
      throw new HttpError(400, "Para ajuste de nómina, la fecha de permiso debe ser N/A");
  } else if (!validDateOnly(body.fechaPermiso) || body.fechaPermiso < context.requestDate) {
    throw new HttpError(400, "Indica una fecha de permiso válida, igual o posterior a la solicitud");
  }
  return { empleado: context.employee, fechaSolicitud: context.requestDate, fechaPermiso: payroll ? null : body.fechaPermiso };
}

module.exports = { employeeRequestContext, employeeRequestData };
