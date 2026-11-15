const employeeRequestTypes = ["Día de la familia", "Permiso remunerado", "Permiso no remunerado", "Ajuste de nómina"];
const legacyRequestTypes = ["Permiso", "Vacaciones", "Certificado"];
module.exports = { employeeRequestTypes, requestTypes: [...employeeRequestTypes, ...legacyRequestTypes] };
