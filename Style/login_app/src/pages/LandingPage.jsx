import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  Shield, 
  LogIn, 
  UserPlus, 
  Home, 
  ArrowRight, 
  Lock, 
  Sparkles,
  CheckCircle2,
  ExternalLink
} from "lucide-react";

import logo from "../assets/Sesha_logo.png";
import fondo from "../assets/fondo.png";
import Servicios from "../components/Servicios";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between selection:bg-teal-500 selection:text-white">
      
      {/* 🔹 NAVBAR CON BOTONES MULTICOLOR */}
      <header className="glass-header border-b border-slate-800/80 sticky top-0 z-50 px-4 sm:px-8 py-3 animate-fade-in-down">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div onClick={() => navigate("/")} className="flex items-center gap-3 cursor-pointer group">
            <div className="bg-slate-900 border border-teal-500/30 p-2 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:border-teal-400 group-hover:scale-105 shadow-md shadow-teal-950/40">
              <img 
                src={logo} 
                alt="SESHA" 
                className="h-6 w-auto object-contain brightness-200"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <span className="font-black text-lg tracking-wider text-white flex items-center gap-1.5">
              SESHA <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">APP</span>
            </span>
          </div>

          {/* 🔹 NAVEGACIÓN CON COLORES DIFERENCIADOS */}
          <nav className="flex items-center gap-2.5">
            
            {/* 1. INICIO - Azul Pizarra con borde tenue */}
            <button 
              onClick={() => navigate("/")}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-all duration-200 flex items-center gap-1.5 active:scale-95 shadow-sm"
            >
              <Home className="w-4 h-4 text-slate-400" /> 
              <span className="hidden sm:inline">Inicio</span>
            </button>

            {/* 2. INGRESAR - Verde Esmeralda Vibrante con Glow */}
            <button 
              onClick={() => navigate("/login")}
              className="px-4 py-1.5 text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 rounded-lg transition-all duration-200 flex items-center gap-1.5 glow-emerald active:scale-95"
            >
              <LogIn className="w-4 h-4 text-emerald-950" /> 
              <span>Ingresar</span>
            </button>

            {/* 3. REGISTRARSE - Violeta / Índigo Electrizante */}
            <button 
              onClick={() => navigate("/register")}
              className="px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-lg transition-all duration-200 flex items-center gap-1.5 glow-indigo active:scale-95"
            >
              <UserPlus className="w-4 h-4" /> 
              <span>Registrarse</span>
            </button>

          </nav>

        </div>
      </header>

      {/* 🔹 HERO SECTION (Fondo con Glow y Estilo Moderno) */}
      <section 
        className="relative max-w-none mx-0 my-0 rounded-none bg-transparent shadow-none py-10 lg:py-14 px-4 sm:px-8 xl:px-12 border-b border-slate-800/80 bg-cover bg-center flex-1 flex items-center overflow-hidden"
        style={{ backgroundImage: `linear-gradient(to right, rgba(2, 6, 23, 0.98), rgba(15, 23, 42, 0.88)), url(${fondo})` }}
      >
        {/* Luz de fondo decorativa */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10 items-center relative z-10">
          
          {/* Texto Principal */}
          <div className="md:col-span-5 space-y-5 text-left animate-fade-in-up delay-100">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500/20 to-emerald-500/10 border border-teal-500/40 px-3.5 py-1.5 rounded-full text-xs font-bold text-teal-300 shadow-inner">
              <Sparkles className="w-4 h-4 text-teal-400" /> Plataforma Integral de Seguridad Privada
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-3xl lg:text-5xl xl:text-6xl font-black text-white tracking-tight leading-tight">
              Gestión Operativa y Control Eficiente de <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400">Personal en Campo</span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
              Automatiza la supervisión, genera certificados oficiales en PDF y reporta novedades en tiempo real con trazabilidad geolocalizada.
            </p>

            {/* BOTONES PRINCIPALES DE ACCIÓN (Grandes y Coloridos) */}
            <div className="flex flex-wrap items-center justify-start gap-3 sm:gap-4 pt-3">
              
              {/* Botón Principal: Cyan/Azul Verde */}
              <button 
                onClick={() => navigate("/login")}
                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl glow-emerald transition-all duration-300 flex items-center gap-2.5 active:scale-95 shadow-lg"
              >
                <span>Acceder al Sistema</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
              
              {/* Botón Secundario: Ámbar / Dorado */}
              <button 
                onClick={() => navigate("/register")}
                className="px-6 py-3 bg-slate-900/90 hover:bg-slate-800 text-amber-400 font-bold text-sm rounded-xl border border-amber-500/40 hover:border-amber-400 transition-all duration-300 flex items-center gap-2.5 glow-amber active:scale-95"
              >
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Crear Cuenta Nueva</span>
              </button>

            </div>
          </div>

          {/* Reproductor de Video en Marco Tecnológico */}
          <div className="md:col-span-7 flex justify-center animate-zoom-in delay-200">
            <div className="w-full bg-slate-900/90 border border-teal-500/30 rounded-2xl p-1.5 shadow-2xl shadow-teal-950/50">
              <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
                <video 
                  aria-label="Demostración de SESHA APP"
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  className="w-full h-full object-contain"
                  poster={fondo}
                >
                  <source src="/sesha_demo.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 🔹 SERVICIOS OPERATIVOS (Tarjetas reducidas y estilizadas) */}
      <section className="py-8 px-4 sm:px-8 max-w-7xl mx-auto space-y-4 w-full animate-fade-in-up delay-300">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-400" /> Servicios Operativos Integrados
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Módulos activos para la gestión de campo</p>
          </div>
          <span className="text-xs font-extrabold text-teal-300 bg-teal-950/80 px-3 py-1 rounded-full border border-teal-500/40 glow-cyan">
            6 Módulos
          </span>
        </div>

        <Servicios compact />
      </section>

      {/* 🔹 FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-3 px-4 text-center text-xs text-slate-500">
        <p>© 2026 SESHA APP — Sistema Operativo de Seguridad Privada</p>
      </footer>

    </div>
  );
}

export default LandingPage;