import React, { useContext } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { AuthContext } from "../context/AuthContext";
import { 
  FileText, 
  Users, 
  Send, 
  ShieldCheck, 
  Activity, 
  AlertTriangle, 
  UserCheck, 
  ArrowRight 
} from "lucide-react";

// Importación de assets de servicios
import fisica from "../assets/seguridad fisica.jpg";
import electronica from "../assets/seguridad electronica.jpg";
import canina from "../assets/seguridad canina.png";
import vip from "../assets/Escolta Vip.jpg";
import mercancias from "../assets/Escolta de mercancias.jpg";
import supervisor from "../assets/Supervisor de Seguridad.png";

import { getGreeting, formatDate } from "../utils/formatters";

function Dashboard() {
  const { user } = useContext(AuthContext) || {};
  const displayName = user?.name || user?.email?.split("@")?.[0] || "Usuario";
  const displayEmail = user?.email || "usuario@sesha.com";

  const services = [
    {
      title: "Seguridad Física",
      image: fisica,
      description: "Control y protección de instalaciones con operatividad garantizada.",
    },
    {
      title: "Seguridad Electrónica",
      image: electronica,
      description: "Monitoreo y respuesta tecnológica para entornos críticos.",
    },
    {
      title: "Seguridad Canina",
      image: canina,
      description: "Unidades caninas especializadas para detección y respaldo operativo.",
    },
    {
      title: "Escolta VIP",
      image: vip,
      description: "Protección personalizada y discreta para personas de alto valor.",
    },
    {
      title: "Escolta de Mercancías",
      image: mercancias,
      description: "Acompañamiento seguro de cargas y logística sensible.",
    },
    {
      title: "Supervisión",
      image: supervisor,
      description: "Gestión operativa del personal y control de desempeño.",
    },
  ];

  const quickModules = [
    {
      title: "Documentos",
      icon: <FileText className="w-6 h-6 text-blue-600" />,
      description: "Accede a certificados, órdenes y comprobantes de forma rápida.",
      to: "/documentos",
      badge: "PDF / 10MB"
    },
    {
      title: "Empleados",
      icon: <Users className="w-6 h-6 text-indigo-600" />,
      description: "Administra el personal y su información operativa.",
      to: "/empleados",
      badge: "Directorio"
    },
    {
      title: "Solicitudes",
      icon: <Send className="w-6 h-6 text-emerald-600" />,
      description: "Gestiona solicitudes internas con control y trazabilidad.",
      to: "/solicitudes",
      badge: "Trámites"
    },
  ];

  const metrics = [
    { label: "Personal activo", value: "124", icon: <UserCheck className="w-5 h-5 text-green-500" /> },
    { label: "Solicitudes hoy", value: "18", icon: <Activity className="w-5 h-5 text-blue-500" /> },
    { label: "Riesgos monitoreados", value: "7", icon: <AlertTriangle className="w-5 h-5 text-amber-500" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-6 max-w-7xl mx-auto space-y-8 w-full">
          
          {/* Banner de Bienvenida */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                Panel principal
              </span>
              <h1 className="text-2xl font-bold text-gray-800">
                {getGreeting()}, {displayName}
              </h1>
              <p className="text-sm text-gray-600">
                Bienvenido a <span className="font-semibold text-gray-800">SESHA APP</span>. Acceso operativo en tiempo real.
                <span className="ml-2 font-medium text-gray-400">| {formatDate()}</span>
              </p>
              <p className="text-xs text-gray-500 pt-1">{displayEmail}</p>
            </div>

            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-200">
              <ShieldCheck className="w-4 h-4" />
              Operación en tiempo real
            </div>
          </section>

          {/* Tarjetas de Métricas Rápidas */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">{metric.label}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{metric.value}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  {metric.icon}
                </div>
              </div>
            ))}
          </section>

          {/* Módulos de Acceso Rápido */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-800">Módulos Principales</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickModules.map((module) => (
                <Link
                  key={module.title}
                  to={module.to}
                  className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition group flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition">
                        {module.icon}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {module.badge}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-gray-800 group-hover:text-blue-600 transition">
                      {module.title}
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {module.description}
                    </p>
                  </div>

                  <div className="flex items-center text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                    Acceder al módulo <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Servicios Operativos / Portafolio */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-800">Servicios y Cobertura Operativa</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service, index) => (
                <article key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                  <div className="h-40 bg-gray-100 overflow-hidden relative">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=500&q=80"; // Imagen de resguardo si falla
                      }}
                    />
                  </div>
                  <div className="p-4 space-y-1">
                    <h3 className="text-sm font-bold text-gray-800">{service.title}</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">{service.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}

export default Dashboard;