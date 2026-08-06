import { jsPDF } from "jspdf";

/**
 * Genera y descarga el comprobante de nómina personalizado
 * @param {Object} usuario - Objeto con la información del usuario logueado
 */
export const descargarNominaPDF = (usuario) => {
  const doc = new jsPDF();

  // Tomamos los datos dinámicos o definimos fallbacks de seguridad
  const nombreEmpleado = usuario?.nombre || "Empleado SESHA";
  const cedula = usuario?.cedula || "No registrada";
  const cargo = usuario?.cargo || "Guarda de Seguridad";
  const puesto = usuario?.puesto || "Instalación Asignada";
  const fechaActual = new Date().toLocaleDateString("es-CO");

  // 1. Encabezado principal
  doc.setFontSize(14);
  doc.setTextColor(13, 148, 136); // Teal de SESHA
  doc.text("SESHA SECURITY MANAGEMENT", 14, 18);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("COMPROBANTE DE PAGO DE NÓMINA - QUINCENAL", 14, 24);
  doc.line(14, 27, 196, 27);

  // 2. Datos del empleado activo
  doc.setFontSize(10);
  doc.setTextColor(15);
  doc.text(`Empleado: ${nombreEmpleado}`, 14, 36);
  doc.text(`C.C.: ${cedula}`, 14, 42);
  doc.text(`Cargo: ${cargo}`, 14, 48);

  doc.text(`Puesto: ${puesto}`, 120, 36);
  doc.text(`Fecha Emisión: ${fechaActual}`, 120, 42);
  doc.text("Período: 01/08/2026 - 15/08/2026", 120, 48);

  // 3. Tabla de Conceptos
  doc.setFillColor(15, 23, 42);
  doc.rect(14, 56, 182, 8, "F");

  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("CONCEPTO", 18, 61);
  doc.text("DEVENGADOS", 120, 61);
  doc.text("DEDUCCIONES", 160, 61);

  // Conceptos
  doc.setTextColor(15);
  doc.text("Sueldo Básico Quincenal", 18, 72);
  doc.text("$ 850.000", 120, 72);
  doc.text("$ 0", 160, 72);

  doc.text("Auxilio de Transporte", 18, 80);
  doc.text("$ 81.000", 120, 80);
  doc.text("$ 0", 160, 80);

  doc.text("Salud (4%)", 18, 88);
  doc.text("$ 0", 120, 88);
  doc.text("$ 36.616", 160, 88);

  doc.text("Pensión (4%)", 18, 96);
  doc.text("$ 0", 120, 96);
  doc.text("$ 36.616", 160, 96);

  // Totales
  doc.line(14, 105, 196, 105);
  doc.setFontSize(11);
  doc.setTextColor(13, 148, 136);
  doc.text("NETO PAGADO: $ 923.168", 120, 115);

  // Guardar archivo
  const nombreLimpio = nombreEmpleado.replace(/\s+/g, "_");
  doc.save(`Comprobante_Nomina_${nombreLimpio}.pdf`);
};