import React, { useState } from 'react';
import { Send, FileText, Upload, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

const Solicitudes = () => {
  const [tipoSolicitud, setTipoSolicitud] = useState('permiso');
  const [motivo, setMotivo] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [loading, setLoading] = useState(false);

  // Historial de ejemplo
  const [historial, setHistorial] = useState([
    { id: 1, tipo: 'Vacaciones', fecha: '2026-07-15', estado: 'Aprobado', soporte: 'solicitud_vac.pdf' },
    { id: 2, tipo: 'Permiso Médico', fecha: '2026-08-01', estado: 'Pendiente', soporte: 'incapacidad.pdf' },
  ]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setError('');
    
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('El documento de soporte debe estar estrictamente en formato PDF.');
        e.target.value = null;
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10 MB
        setError('El archivo supera el límite máximo permitido de 10 MB.');
        e.target.value = null;
        return;
      }
      setArchivo(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setError('Por favor describe el motivo de la solicitud.');
      return;
    }

    setLoading(true);
    setError('');

    // Simulación de envío al backend Express
    setTimeout(() => {
      const nuevaSolicitud = {
        id: Date.now(),
        tipo: tipoSolicitud === 'permiso' ? 'Permiso' : tipoSolicitud === 'vacaciones' ? 'Vacaciones' : 'Certificado',
        fecha: new Date().toISOString().split('T')[0],
        estado: 'Pendiente',
        soporte: archivo ? archivo.name : 'Sin archivo'
      };

      setHistorial([nuevaSolicitud, ...historial]);
      setMotivo('');
      setArchivo(null);
      setExito('¡Solicitud radicada con éxito!');
      setLoading(false);

      setTimeout(() => setExito(''), 4000);
    }, 1200);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Módulo de Solicitudes</h1>
        <p className="text-sm text-gray-600">Radica y gestiona tus trámites laborales con anexos en PDF (Máx. 10MB).</p>
      </header>

      {/* Formulario de Creación */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
          <Send className="w-5 h-5 text-blue-600" /> Crear Nueva Solicitud
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {exito && (
          <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{exito}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Solicitud</label>
              <select
                value={tipoSolicitud}
                onChange={(e) => setTipoSolicitud(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="permiso">Permiso Laboral / Médico</option>
                <option value="vacaciones">Solicitud de Vacaciones</option>
                <option value="certificado">Certificado Laboral Especial</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anexar Soporte (PDF, máx 10MB)</label>
              <div className="relative border border-gray-300 rounded-md p-2 bg-gray-50 flex items-center gap-2">
                <Upload className="w-5 h-5 text-gray-500" />
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo / Descripción</label>
            <textarea
              rows="3"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Escribe los detalles de tu solicitud..."
              className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow transition flex items-center justify-center gap-2 disabled:bg-blue-300"
          >
            {loading ? 'Procesando...' : 'Radicar Solicitud'}
          </button>
        </form>
      </div>

      {/* Historial */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600" /> Historial de Solicitudes
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-600 text-sm">
                <th className="p-3">Tipo</th>
                <th className="p-3">Fecha</th>
                <th className="p-3">Soporte Anexo</th>
                <th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm text-gray-700">
              {historial.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-3 font-medium">{item.tipo}</td>
                  <td className="p-3">{item.fecha}</td>
                  <td className="p-3 flex items-center gap-1 text-gray-500">
                    <FileText className="w-4 h-4 text-red-500" />
                    {item.soporte}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        item.estado === 'Aprobado'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {item.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Solicitudes;
