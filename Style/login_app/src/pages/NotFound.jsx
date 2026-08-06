import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

function NotFound() {
  const navigate = useNavigate();

  return (
    <main className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="bg-white p-8 md:p-12 rounded-xl shadow-md border border-gray-100 max-w-lg w-full text-center space-y-6">
        
        {/* Ícono de Error / Ruta no encontrada */}
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <FileQuestion className="w-10 h-10" />
        </div>

        {/* Código y Mensaje */}
        <div className="space-y-2">
          <span className="text-xs font-bold tracking-widest text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-full">
            Error 404
          </span>
          <h1 className="text-2xl font-bold text-gray-800">Página no encontrada</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            La ruta o módulo al que intentas acceder no existe, ha sido movido o no tienes permisos para visualizarlo.
          </p>
        </div>

        {/* Botones de Navegación */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md shadow-sm transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Volver atrás
          </button>

          <Link
            to="/dashboard"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow transition flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Ir al Dashboard
          </Link>
        </div>

      </div>
    </main>
  );
}

export default NotFound;
