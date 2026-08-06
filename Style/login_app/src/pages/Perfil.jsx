import React from "react";
import { 
  User, 
  ShieldCheck, 
  CreditCard, 
  Briefcase, 
  MapPin, 
  Download, 
  FileCheck, 
  Mail, 
  Phone 
} from "lucide-react";
import { descargarNominaPDF } from "../utils/pdfGenerator";

function Perfil({ usuario }) {
  // Datos simulados por si la prop 'usuario' viene vacía o incompleta
  const datosEmpleado = {
    nombre: usuario?.nombre || "Carlos Eduardo Pérez",
    cedula: usuario?.cedula || "1.020.304.050",
    cargo: usuario?.cargo || "Guarda de Seguridad Principal",
    puesto: usuario?.puesto || "Central de Monitoreo - Sede Norte",
    correo: usuario?.correo || "carlos.perez@sesha.com",
    telefono: usuario?.telefono || "+57 310 987 6543",
    rol: usuario?.rol || "OPERATIVO",
    estado: usuario?.estado || "ACTIVO"
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* 1. Encabezado del Perfil */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Avatar / Foto de Perfil */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 flex-shrink-0 shadow-lg shadow-teal-950/50">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <User className="w-10 h-10 text-teal-400" />
            </div>
          </div>

          {/* Información Principal */}
          <div className="text-center sm:text-left space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl font-extrabold text-white">
                {datosEmpleado.nombre}
              </h1>
              <span className="px-2.5 py-0.5 bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                {datosEmpleado.rol}
              </span>
            </div>
            <p className="text-sm text-slate-400 font-medium flex items-center justify-center sm:justify-start gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-500" /> {datosEmpleado.cargo}
            </p>
            <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" /> {datosEmpleado.puesto}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Detalles del Empleado */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-400" /> Información Laboral & Contacto
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <div>
              <span className="block text-slate-500 font-medium text-[11px]">Documento Identidad</span>
              <span className="text-slate-200 font-bold">{datosEmpleado.cedula}</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 flex items-center gap-3">
            <Mail className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <div>
              <span className="block text-slate-500 font-medium text-[11px]">Correo Institucional</span>
              <span className="text-slate-200 font-bold">{datosEmpleado.correo}</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 flex items-center gap-3">
            <Phone className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <div>
              <span className="block text-slate-500 font-medium text-[11px]">Teléfono Contacto</span>
              <span className="text-slate-200 font-bold">{datosEmpleado.telefono}</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <div>
              <span className="block text-slate-500 font-medium text-[11px]">Estado Contractual</span>
              <span className="text-emerald-400 font-bold uppercase">{datosEmpleado.estado}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Módulo de Descarga del Comprobante de Nómina */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-teal-400" /> Mi Comprobante de Pago
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Descarga tu último desprendible de pago quincenal personalizado en PDF.
            </p>
          </div>

          {/* Botón que ejecuta la descarga */}
          <button
            onClick={() => descargarNominaPDF(datosEmpleado)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-teal-950/50 active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            Descargar PDF
          </button>
        </div>

        {/* Resumen rápido del comprobante */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-300 space-y-1.5">
          <p><strong className="text-slate-100">Titular:</strong> {datosEmpleado.nombre}</p>
          <p><strong className="text-slate-100">Documento:</strong> {datosEmpleado.cedula}</p>
          <p><strong className="text-slate-100">Estado de pago:</strong> <span className="text-emerald-400 font-semibold">Procesado / Abonado</span></p>
        </div>
      </div>

    </div>
  );
}

export default Perfil;