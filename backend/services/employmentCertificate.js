const PDFDocument = require("pdfkit");
const path = require("path");
const { dateInBogota, hireDate, longDate } = require("../utils/dates");

function certificateDetails(user, profile, issuedAt = new Date()) {
  return {
    name: user.name || profile.name,
    document: profile.document,
    position: profile.position,
    department: profile.department,
    status: profile.status,
    hireDate: hireDate(profile.hireDate, issuedAt),
    issuedDate: dateInBogota(issuedAt),
  };
}

function employmentCertificate(details) {
  const pdf = new PDFDocument({
    size: "A4",
    margin: 56,
    info: {
      Title: "Sesha - Constancia laboral",
      Author: "Sesha",
      Subject: "Constancia laboral de " + details.name,
    },
  });
  const width = pdf.page.width - 112;
  const compact = [details.name, details.position, details.department].some(
    (value) => value.length > 70,
  );
  const navy = "#142c45",
    teal = "#0d9488",
    ink = "#243649";
  pdf.registerFont(
    "DemoSignature",
    path.join(__dirname, "../assets/fonts/Allura-Regular.ttf"),
  );
  pdf.rect(0, 0, pdf.page.width, 108).fill(navy);
  pdf.rect(0, 108, pdf.page.width, 5).fill(teal);
  pdf.image(path.join(__dirname, "../assets/sesha-logo.png"), 467, 10, {
    fit: [72, 88],
    align: "center",
    valign: "center",
  });
  pdf
    .fillColor("white")
    .font("Helvetica-Bold")
    .fontSize(29)
    .text("Sesha", 56, 34);
  pdf
    .font("Helvetica")
    .fontSize(9)
    .text("GESTIÓN DE TALENTO HUMANO", 57, 73, { characterSpacing: 1.1 });
  pdf
    .fillColor(navy)
    .font("Helvetica-Bold")
    .fontSize(18)
    .text("CONSTANCIA LABORAL", 56, 148, { width, align: "center" });
  pdf
    .fillColor("#526579")
    .font("Helvetica")
    .fontSize(10)
    .text("Fecha de expedición: " + longDate(details.issuedDate), 56, 181, {
      width,
      align: "center",
    });
  pdf
    .fillColor(ink)
    .fontSize(11)
    .text("La Dirección de Talento Humano de Sesha", 56, 224, {
      width,
      align: "center",
    });
  pdf
    .font("Helvetica-Bold")
    .text("HACE CONSTAR:", 56, 246, { width, align: "center" });
  const employment =
    details.status === "Activo"
      ? "se encuentra vinculado(a) laboralmente a Sesha"
      : "registra vinculación laboral con Sesha, con estado actual inactivo";
  const body = `Que ${details.name}, identificado(a) con cédula de ciudadanía No. ${details.document}, ${employment} desde el ${longDate(details.hireDate)}, desempeñando el cargo de ${details.position} en el área de ${details.department}.`;
  pdf
    .font("Helvetica")
    .fontSize(compact ? 10 : 11)
    .text(body, 56, compact ? 274 : 283, {
      width,
      align: "justify",
      lineGap: compact ? 3 : 5,
    });
  const rows = [
    ["Nombre completo", details.name],
    ["Documento", details.document],
    ["Cargo", details.position],
    ["Área", details.department],
    ["Fecha de ingreso", longDate(details.hireDate)],
    ["Estado laboral", details.status],
  ];
  let y = pdf.y + (compact ? 14 : 22);
  for (let i = 0; i < rows.length; i++) {
    const [label, value] = rows[i];
    pdf.font("Helvetica").fontSize(compact ? 9 : 10);
    const height = Math.max(
      compact ? 28 : 31,
      pdf.heightOfString(value, { width: width - 172 }) + 18,
    );
    pdf.rect(56, y, width, height).fill(i % 2 === 0 ? "#eef4f7" : "#f8fafc");
    pdf
      .fillColor(navy)
      .font("Helvetica-Bold")
      .text(label, 68, y + 10, { width: 139 });
    pdf
      .fillColor(ink)
      .font("Helvetica")
      .text(value, 216, y + 10, { width: width - 172 });
    y += height;
  }
  pdf
    .fontSize(10.5)
    .text(
      `La presente constancia se expide a solicitud de la persona interesada el ${longDate(details.issuedDate)}, para los fines que estime pertinentes.`,
      56,
      y + (compact ? 16 : 24),
      { width, lineGap: 4 },
    );
  const signatureY = Math.max(667, pdf.y + 40);
  const signer = "Mariana Isabel Torres Ríos";
  pdf.fillColor(navy).font("DemoSignature").fontSize(29);
  pdf.fontSize(Math.min(29, (29 * 229) / pdf.widthOfString(signer)));
  pdf.text(signer, 56, signatureY - 35, { width: 230, lineBreak: false });
  pdf
    .moveTo(56, signatureY)
    .lineTo(285, signatureY)
    .lineWidth(0.7)
    .strokeColor("#a6b4bf")
    .stroke();
  pdf
    .fillColor(navy)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(signer, 56, signatureY + 10);
  pdf
    .font("Helvetica")
    .fontSize(9)
    .text("Directora de Talento Humano", 56, signatureY + 25);
  pdf
    .fontSize(8)
    .fillColor("#738294")
    .text("Firma ficticia", 56, signatureY + 39);
  const bottomMargin = pdf.page.margins.bottom;
  pdf.page.margins.bottom = 0;
  pdf
    .fillColor("#738294")
    .fontSize(8)
    .text(
      "Documento generado por Sesha. Datos ficticios para demostración.",
      56,
      785,
      { width, align: "center" },
    );
  pdf.page.margins.bottom = bottomMargin;
  return pdf;
}

module.exports = { certificateDetails, employmentCertificate };
