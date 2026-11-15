const PDFDocument = require("pdfkit");
const path = require("node:path");
const { HttpError } = require("../utils/http");
const { dateInBogota, hireDate, longDate } = require("../utils/dates");
const { payrollForPosition, healthPercent, pensionPercent, payment } = require("../config/payroll");
const { payrollPeriod } = require("./payrollPeriods");

const scopeNote = "Base calculada desde el neto acordado. Tasas del 2 % solicitadas para este comprobante; no sustituye la liquidación legal de aportes. Sin validación bancaria ni liquidación de novedades.";
const formatCOP = (amount) => "$ " + new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(amount);

function payrollBreakdown(net) {
  if (!Number.isSafeInteger(net) || net <= 0 || !Number.isSafeInteger(net * 100))
    throw new Error("El neto del período debe ser un valor positivo en pesos enteros");
  const estimate = net * 100 / (100 - healthPercent - pensionPercent);
  const candidates = [];
  // Ambas deducciones se redondean por separado. Se busca una base en pesos
  // que cierre exactamente, evitando ajustes ficticios o diferencias de $1.
  for (let gross = Math.floor(estimate) - 3; gross <= Math.ceil(estimate) + 3; gross++) {
    const health = Math.round(gross * healthPercent / 100);
    const pension = Math.round(gross * pensionPercent / 100);
    if (gross - health - pension === net)
      candidates.push({ gross, health, pension, deductions: health + pension, net, healthPercent, pensionPercent });
  }
  candidates.sort((a, b) => Math.abs(a.gross - estimate) - Math.abs(b.gross - estimate) || a.gross - b.gross);
  if (!candidates.length) throw new Error("No se pudo conciliar el neto mensual");
  return candidates[0];
}

function payslipDetails(user, profile, period, issuedAt = new Date(), half) {
  if (!user || user.role !== "employee") throw new HttpError(403, "El desprendible está disponible para empleados");
  if (!profile || String(profile.user) !== String(user._id))
    throw new HttpError(409, "Solicita al administrador que complete tu perfil laboral");
  if (profile.status !== "Activo") throw new HttpError(409, "Tu perfil laboral debe estar activo para generar esta liquidación");
  const issuedDate = dateInBogota(issuedAt);
  const selected = payrollPeriod(period, half, issuedAt);
  const employmentDate = hireDate(profile.hireDate, issuedAt);
  if (selected.periodEnd < employmentDate) throw new HttpError(400, "El período no puede ser anterior al ingreso del empleado");
  if (selected.periodStart < employmentDate) throw new HttpError(409, "La quincena de ingreso requiere liquidar los días trabajados con el administrador");
  const configured = payrollForPosition(profile.position);
  if (!configured) throw new HttpError(409, "El cargo necesita una asignación salarial. Solicita su revisión al administrador.");
  const monthlyNet = configured.net;
  if (!Number.isSafeInteger(monthlyNet) || monthlyNet <= 0) throw new HttpError(409, "Revisa la asignación mensual del perfil laboral");
  const firstHalf = Math.floor(monthlyNet / 2);
  const net = selected.half === "1" ? firstHalf : monthlyNet - firstHalf;
  return {
    name: user.name, email: user.email, document: profile.document,
    position: profile.position, department: profile.department, hireDate: employmentDate,
    ...selected, issuedDate, currency: "COP", basis: "Liquidación quincenal con neto acordado", monthlyNet,
    ...payrollBreakdown(net), deductionStatus: "Salud y pensión descontadas en esta quincena", contributionBasis: "Devengado quincenal",
    schedule: { ...configured.schedule }, payment: { ...payment }, scopeNote,
  };
}

function payslipPDF(details) {
  const pdf = new PDFDocument({ size: "A4", margin: 48, info: {
    Title: "Sesha - Desprendible de nómina", Author: "Sesha", Subject: "Devengado, deducciones y total a pagar de " + details.name,
  } });
  const navy = "#142c45", teal = "#087f80", ink = "#26374a", muted = "#526477";
  const width = pdf.page.width - 96;
  pdf.rect(0, 0, pdf.page.width, 107).fill(navy);
  pdf.image(path.join(__dirname, "../assets/sesha-logo.png"), 479, 9, { fit: [68, 86] });
  pdf.fillColor("white").font("Helvetica-Bold").fontSize(28).text("Sesha", 48, 29);
  pdf.font("Helvetica").fontSize(9).text("GESTIÓN DE TALENTO HUMANO", 49, 68, { characterSpacing: 1 });
  pdf.rect(0, 107, pdf.page.width, 4).fill(teal);
  pdf.fillColor(navy).font("Helvetica-Bold").fontSize(19).text("DESPRENDIBLE DE NÓMINA", 48, 137, { width });
  const shortDate = (date) => date.split("-").reverse().join("/");
  pdf.fillColor(muted).font("Helvetica").fontSize(9).text(details.periodLabel, 48, 163, { width: 300 });
  pdf.text(`Del ${shortDate(details.periodStart)} al ${shortDate(details.periodEnd)}`, 48, 179, { width: 300 });
  pdf.fontSize(8).text(`Expedición: ${longDate(details.issuedDate)}`, 48, 195, { width: 300 });
  pdf.fillColor("#eef4f7").roundedRect(355, 158, 192, 52, 5).fill();
  pdf.fillColor(muted).font("Helvetica-Bold").fontSize(7.5).text("ASIGNACIÓN MENSUAL NETA", 365, 168, { width: 172, align: "right" });
  pdf.fillColor(teal).fontSize(16).text(formatCOP(details.monthlyNet), 365, 184, { width: 172, align: "right" });
  pdf.fillColor(teal).font("Helvetica-Bold").fontSize(10).text("DATOS DEL EMPLEADO", 48, 218, { width });
  let y = 241;
  const employeeFields = [
    ["Nombre completo", details.name], ["Documento", details.document], ["Correo", details.email],
    ["Cargo", details.position], ["Área", details.department], ["Fecha de ingreso", longDate(details.hireDate)],
  ];
  const compact = employeeFields.some(([, value]) => value.length > 70);
  for (const [index, [label, value]] of employeeFields.entries()) {
    pdf.font("Helvetica").fontSize(compact ? 7.3 : 10);
    const height = Math.max(compact ? 20 : 25, pdf.heightOfString(value, { width: width - 147 }) + (compact ? 8 : 12));
    pdf.fillColor(index % 2 ? "#f8fafc" : "#eef4f7").rect(48, y, width, height).fill();
    pdf.fillColor(muted).font("Helvetica-Bold").text(label, 59, y + 7, { width: 122 });
    pdf.fillColor(ink).font("Helvetica").text(value, 184, y + 7, { width: width - 147 });
    y += height;
  }
  y += 18;
  pdf.fillColor(teal).font("Helvetica-Bold").fontSize(10).text("PROGRAMACIÓN LABORAL", 48, y, { width });
  pdf.fillColor(ink).font("Helvetica").fontSize(10).text(`${details.schedule.code}: ${details.schedule.label}`, 48, y + 18, { width, lineGap: 3 });
  y = pdf.y + 22;
  pdf.fillColor(muted).fontSize(8).text("DETALLE DE LIQUIDACIÓN  /  VALORES EN PESOS COLOMBIANOS (COP)", 48, y, { width });
  y += 17;
  const columns = [
    { x: 59, width: 176, align: "left" },
    { x: 240, width: 92, align: "right" },
    { x: 339, width: 95, align: "right" },
    { x: 441, width: width - 404, align: "right" },
  ];
  const cells = (values, rowY, color, bold = false, fontSize = 9) => {
    pdf.fillColor(color).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize);
    values.forEach((value, index) => pdf.text(value, columns[index].x, rowY, {
      width: columns[index].width, align: columns[index].align, lineBreak: false,
    }));
  };
  pdf.fillColor(navy).rect(48, y, width, 34).fill();
  cells(["CONCEPTO", "DEVENGADO", "DEDUCCIONES", "TOTAL A PAGAR"], y + 12, "white", true, 8);
  y += 34;
  const rows = [
    ["Devengado de la quincena", formatCOP(details.gross), "-", "-"],
    [`Salud (${details.healthPercent} %)`, "-", formatCOP(details.health), "-"],
    [`Pensión (${details.pensionPercent} %)`, "-", formatCOP(details.pension), "-"],
  ];
  rows.forEach((row, index) => {
    pdf.fillColor(index % 2 ? "#f8fafc" : "#eef4f7").rect(48, y, width, 31).fill();
    cells(row, y + 11, ink);
    y += 31;
  });
  pdf.fillColor(teal).rect(48, y, width, 37).fill();
  cells(["TOTALES", formatCOP(details.gross), formatCOP(details.deductions), formatCOP(details.net)], y + 13, "white", true);
  y += 55;
  pdf.fillColor(ink).font("Helvetica-Bold").fontSize(10).text("TOTAL A PAGAR", 48, y, { width: 200 });
  pdf.fillColor(teal).fontSize(18).text(formatCOP(details.net), 308, y - 4, { width: width - 260, align: "right" });
  y = Math.max(y + 32, pdf.y + 15);
  pdf.fillColor("#eef4f7").roundedRect(48, y, width, 38, 4).fill();
  pdf.fillColor(muted).font("Helvetica-Bold").fontSize(7.5).text("PAGO INFORMADO POR SESHA", 59, y + 7, { width: width - 22 });
  pdf.fillColor(ink).font("Helvetica").fontSize(9).text(`${details.payment.method} a la cuenta del empleado - ${details.payment.bank}`, 59, y + 20, { width: width - 22 });
  y += 49;
  pdf.fillColor(muted).font("Helvetica").fontSize(7.5).text(details.scopeNote, 48, y, { width, lineGap: 2 });
  return pdf;
}

module.exports = { payslipDetails, payslipPDF, formatCOP, payrollBreakdown };
