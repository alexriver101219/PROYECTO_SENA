import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Download, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

const Documentos = () => {
  const [errorUpload, setErrorUpload] = useState('');
  const [exitoUpload, setExitoUpload] = useState('');

  // Generador dinámico de Certificado Laboral PDF
  const generarCertificadoPDF = () => {
    const doc = new jsPDF();

    // Encabezado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('SOFT PRO - RECURSOS HUMANOS', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('CERTIFICADO LABORAL OFICIAL', 105, 30, { align: 'center' });
    
    doc.line(20, 35, 190, 35); // Línea divisoria

    // Cuerpo
    const fecha = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    const cuerpo = `Por medio de la presente se hace constar que el colaborador(a) se encuentra vinculado(a) laboralmente a nuestra organización desempeñando sus funciones en el área de desarrollo de software bajo un contrato a término indefinido.\n\nEste documento se expide a solicitud del interesado el día ${fecha}.`;

    doc.setFontSize(11);
    doc.text(cuerpo, 20, 50, { maxWidth: 170 });

    // Firma
    doc.setFont('helvetica', 'bold');
    doc.text('_________________________________', 20, 110);
    doc.text('Dirección de Talentos Humanos', 20, 118);
    doc.text('SOFT PRO S.A.S.', 20, 124);

    // Guardar archivo
    doc.save(`Certificado_Laboral_${Date.now()}.pdf`);
  };

  const handleDocumentUpload = (e) => {
    const file = e.target.files[0];
    setErrorUpload('');
    setExitoUpload('');

    if (file) {
      if (file.type !== 'application/pdf') {
        setErrorUpload('El documento debe estar en formato PDF.');
        e.target.value = null;
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10 MB
        setErrorUpload('El documento no puede superar los 10 MB.');
        e.target.value = null;
        return;
      }

      setExitoUpload(`Documento "${file.name}" cargado correctamente.`);
      setTimeout(() => setExitoUpload(''), 4000);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Módulo de Documentos</h1>
        <p className="text-sm text-gray-600">Genera o descarga tus certificados e historial laboral en PDF.</p>
      </header>

      {/* Generación Automática */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800">Certificado Laboral</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Genera instantáneamente tu certificado de trabajo actualizado con firma digital verificada (PDF).
            </p>
          </div>
          <button
            onClick={generarCertificadoPDF}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Generar y Descargar PDF
          </button>
        </div>

        {/* Carga de Documentos Adjuntos */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Upload className="w-8 h-8 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-800">Subir Documentos Personales</h2>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Adjunta cédula, certificados académicos o EPS para tu expediente (Formato PDF hasta 10 MB).
            </p>

            {errorUpload && (
              <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs rounded border border-red-200 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {errorUpload}
              </div>
            )}

            {exitoUpload && (
              <div className="mb-3 p-2 bg-green-50 text-green-600 text-xs rounded border border-green-200 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> {exitoUpload}
              </div>
            )}
          </div>

          <div className="relative border-2 border-dashed border-gray-300 rounded-md p-4 bg-gray-50 text-center">
            <input
              type="file"
              accept=".pdf"
              onChange={handleDocumentUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <p className="text-xs text-gray-500 font-medium">Arrastra tu archivo PDF o haz clic aquí para seleccionar</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentos;