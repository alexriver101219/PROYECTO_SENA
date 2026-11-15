const PDFDocument = require("pdfkit");
const path = require("node:path");
const { HttpError } = require("../utils/http");
const { dateInBogota, hireDate, longDate } = require("../utils/dates");
const { payrollForPosition } = require("../config/payroll");

const scopeNote = "Valor neto mensual informado por SESHA. Salud y pensión ya descontadas. No calcula recargos, horas extra, auxilios ni otras novedades. No acredita pago.";
const formatCOP = (amount) => "$ " + new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(amount);

function payslipDetails(user, profile, period, issuedAt = new Date()) {
  if (!user || user.role !== "employee") throw new HttpError(403, "El desprendible está disponible para empleados");
  if (!profile || String(profile.user) !== String(user._id))
    throw new HttpError(409, "Solicita al administrador que complete tu perfil laboral");
  if (profile.status !== "Activo") throw new HttpError(409, "Tu perfil laboral debe estar activo para generar esta liquidación");
  const issuedDate = dateInBogota(issuedAt);
  const selected = period === undefined ? issuedDate.slice(0, 7) : period;
  if (typeof selected !== "string" || !/^(20\d{2})-(0[1-9]|1[0-2])$/u.test(selected) || selected > issuedDate.slice(0, 7))
    throw new HttpError(400, "Selecciona un mes válido que no esté en el futuro");
  const employmentDate = hireDate(profile.hireDate, issuedAt);
  if (selected < employmentDate.slice(0, 7)) throw new HttpError(400, "El período no puede ser anterior al ingreso del empleado");
  const configured = payrollForPosition(profile.position);
  if (!configured) throw new HttpError(409, "El cargo necesita una asignación salarial. Solicita su revisión al administrador.");
  const periodLabel = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", month: "long", year: "numeric" })
    .format(new Date(selected + "-01T12:00:00Z"));
  return {
    name: user.name, email: user.email, document: profile.document,
    position: profile.position, department: profile.department, hireDate: employmentDate,
    period: selected, periodLabel, issuedDate, currency: "COP", basis: "Valor neto mensual",
    net: configured.net, deductionStatus: "Salud y pensión ya descontadas",
    schedule: { ...configured.schedule }, scopeNote,
  };
}

function payslipPDF(details) {
  const pdf = new PDFDocument({ size: "A4", margin: 48, info: {
    Title: "Sesha - Desprendible de nómina", Author: "Sesha", Subject: "Liquidación mensual básica de " + details.name,
  } });
  const navy = "#142c45", teal = "#087f80", ink = "#26374a", muted = "#526477";
  const width = pdf.page.width - 96;
  pdf.rect(0, 0, pdf.page.width, 107).fill(navy);
  pdf.image(path.join(__dirname, "../assets/sesha-logo.png"), 479, 9, { fit: [68, 86] });
  pdf.fillColor("white").font("Helvetica-Bold").fontSize(28).text("Sesha", 48, 29);
  pdf.font("Helvetica").fontSize(9).text("GESTIÓN DE TALENTO HUMANO", 49, 68, { characterSpacing: 1 });
  pdf.rect(0, 107, pdf.page.width, 4).fill(teal);
  pdf.fillColor(navy).font("Helvetica-Bold").fontSize(19).text("DESPRENDIBLE DE NÓMINA", 48, 137, { width });
  pdf.fillColor(muted).font("Helvetica").fontSize(10).text(`Período: ${details.periodLabel}  |  Moneda: COP`, 48, 166, { width });
  pdf.fontSize(9).text(`Expedición: ${longDate(details.issuedDate)}`, 48, 184, { width });
  pdf.fillColor(teal).font("Helvetica-Bold").fontSize(10).text("DATOS DEL EMPLEADO", 48, 218, { width });
  let y = 241;
  for (const [label, value] of [
    ["Nombre completo", details.name], ["Documento", details.document], ["Correo", details.email],
    ["Cargo", details.position], ["Área", details.department], ["Fecha de ingreso", longDate(details.hireDate)],
  ]) {
    pdf.font("Helvetica").fontSize(10);
    const height = Math.max(25, pdf.heightOfString(value, { width: width - 139 }) + 12);
    pdf.fillColor(y % 2 ? "#eef4f7" : "#f8fafc").rect(48, y, width, height).fill();
    pdf.fillColor(muted).font("Helvetica-Bold").text(label, 59, y + 7, { width: 122 });
    pdf.fillColor(ink).font("Helvetica").text(value, 184, y + 7, { width: width - 147 });
    y += height;
  }
  y += 18;
  pdf.fillColor(teal).font("Helvetica-Bold").fontSize(10).text("PROGRAMACIÓN LABORAL", 48, y, { width });
  pdf.fillColor(ink).font("Helvetica").fontSize(10).text(`${details.schedule.code}: ${details.schedule.label}`, 48, y + 18, { width, lineGap: 3 });
  y = pdf.y + 22;
  pdf.fillColor(navy).rect(48, y, width, 29).fill();
  pdf.fillColor("white").font("Helvetica-Bold").fontSize(10).text("CONCEPTO", 59, y + 10, { width: 300 });
  pdf.text("VALOR (COP)", 393, y + 10, { width: width - 356, align: "right" });
  y += 29;
  pdf.fillColor("#eef4f7").rect(48, y, width, 32).fill();
  pdf.fillColor(ink).font("Helvetica").fontSize(10).text("Valor neto mensual", 59, y + 10, { width: 310 });
  pdf.text(formatCOP(details.net), 380, y + 10, { width: width - 343, align: "right" });
  y += 50;
  pdf.fillColor(muted).font("Helvetica").fontSize(10).text(details.deductionStatus + ".", 48, y, { width });
  y = pdf.y + 10;
  y += 9;
  pdf.fillColor(teal).rect(48, y, width, 39).fill();
  pdf.fillColor("white").font("Helvetica-Bold").fontSize(12).text("NETO MENSUAL", 59, y + 13, { width: 290 });
  pdf.fontSize(16).text(formatCOP(details.net), 356, y + 11, { width: width - 319, align: "right" });
  y += 56;
  pdf.fillColor(muted).font("Helvetica").fontSize(8).text(details.scopeNote, 48, y, { width, lineGap: 3 });
  pdf.fontSize(8).text("Valores según la tabla salarial configurada por SESHA. El período no certifica días ni turnos efectivamente trabajados.", 48, pdf.y + 7, { width, lineGap: 3 });
  return pdf;
}

module.exports = { payslipDetails, payslipPDF, formatCOP };
