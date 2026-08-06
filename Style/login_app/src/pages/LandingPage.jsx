import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Shield, 
  LogIn, 
  UserPlus, 
  Home, 
  ArrowRight, 
  Play, 
  Lock, 
  Sparkles,
  ChevronRight,
  CheckCircle2,
  ExternalLink
} from "lucide-react";

import logo from "../assets/Sesha_logo.png";
import fondo from "../assets/fondo.png";

import fisica from "../assets/seguridad fisica.jpg";
import electronica from "../assets/seguridad electronica.jpg";
import canina from "../assets/seguridad canina.png";
import vip from "../assets/Escolta Vip.jpg";
import mercancias from "../assets/Escolta de mercancias.jpg";
import supervisor from "../assets/Supervisor de Seguridad.png";

function LandingPage() {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);

  const services = [
    { title: "Seguridad Física", desc: "Control de acceso y vigilancia fija.", image: fisica, tag: "Operativo", color: "from-blue-500/20 to-teal-500/10" },
    { title: "Seguridad Electrónica", desc: "Monitoreo CCTV y alarmas 24/7.", image: electronica, tag: "Tech", color: "from-indigo-500/20 to-purple-500/10" },
    { title: "Seguridad Canina", desc: "Detección y patrullaje K9.", image: canina, tag: "K9", color: "from-amber-500/20 to-orange-500/10" },
    { title: "Escolta VIP", desc: "Protección ejecutiva personal.", image: vip, tag: "VIP", color: "from-emerald-500/20 to-teal-500/10" },
    { title: "Escolta Mercancías", desc: "Custodia de carga y rutas.", image: mercancias, tag: "Rutas", color: "from-cyan-500/20 to-blue-500/10" },
    { title: "Supervisión Operativa", desc: "Control y auditorías en campo.", image: supervisor, tag: "Control", color: "from-rose-500/20 to-pink-500/10" },
  ];

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
        className="relative py-12 lg:py-16 px-4 sm:px-8 border-b border-slate-800/80 bg-cover bg-center flex-1 flex items-center overflow-hidden"
        style={{ backgroundImage: `linear-gradient(to right, rgba(2, 6, 23, 0.98), rgba(15, 23, 42, 0.88)), url(${fondo})` }}
      >
        {/* Luz de fondo decorativa */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center w-full relative z-10">
          
          {/* Texto Principal */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left animate-fade-in-up delay-100">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500/20 to-emerald-500/10 border border-teal-500/40 px-3.5 py-1.5 rounded-full text-xs font-bold text-teal-300 shadow-inner">
              <Sparkles className="w-4 h-4 text-teal-400" /> Plataforma Integral de Seguridad Privada
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              Gestión Operativa y Control Eficiente de <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400">Personal en Campo</span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto lg:mx-0 font-normal">
              Automatiza la supervisión, genera certificados oficiales en PDF y reporta novedades en tiempo real con trazabilidad geolocalizada.
            </p>

            {/* BOTONES PRINCIPALES DE ACCIÓN (Grandes y Coloridos) */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-3">
              
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
          <div className="lg:col-span-5 flex justify-center animate-zoom-in delay-200">
            <div className="w-full max-w-md bg-slate-900/90 border border-teal-500/30 rounded-2xl p-1.5 shadow-2xl shadow-teal-950/50 relative group">
              
              <div 
                className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden cursor-pointer border border-slate-800" 
                onClick={() => setIsPlaying(!isPlaying)}
              >
                <video 
                  controls={isPlaying}
                  className="w-full h-full object-cover"
                  poster={fondo}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                >
                  <source src="/sesha_demo.mp4" type="video/mp4" />
                </video>

                {!isPlaying && (
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 transition-all duration-300 group-hover:bg-slate-950/40">
                    <div className="w-14 h-14 bg-gradient-to-tr from-teal-400 to-emerald-400 text-slate-950 rounded-full flex items-center justify-center shadow-xl glow-emerald transition-transform duration-300 group-hover:scale-110">
                      <Play className="w-7 h-7 fill-slate-950 ml-1" />
                    </div>
                    <span className="text-xs font-bold text-slate-200 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
                      Ver Demostración del Sistema
                    </span>
                  </div>
                )}
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

        {/* REJILLA DE TARJETAS CON TAMAÑO DE IMAGEN CONTROLADO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {services.map((service, index) => (
            <div 
              key={index} 
              className={`bg-gradient-to-br ${service.color} glass-card rounded-xl p-2.5 flex items-center gap-3.5 transition-all duration-300 group cursor-pointer`}
            >
              {/* ⚠️ IMAGEN CON TAMAÑO FIJO CONTROLADO (W-16 H-14) */}
              <div className="w-16 h-14 rounded-lg bg-slate-950 overflow-hidden flex-shrink-0 relative border border-slate-700/80 shadow-md">
                <img 
                  src={service.image} 
                  alt={service.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=150&q=80";
                  }}
                />
              </div>

              {/* Contenido de la Tarjeta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h3 className="text-xs font-extrabold text-white group-hover:text-teal-300 transition-colors duration-200 truncate">
                    {service.title}
                  </h3>
                  <span className="text-[9px] font-bold text-slate-300 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700">
                    {service.tag}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-1">
                  {service.desc}
                </p>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-300 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          ))}
        </div>
      </section>

      {/* 🔹 FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-3 px-4 text-center text-xs text-slate-500">
        <p>© 2026 SESHA APP — Sistema Operativo de Seguridad Privada</p>
      </footer>

    </div>
  );
}

export default LandingPage;