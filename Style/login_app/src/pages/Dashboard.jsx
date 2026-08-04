import React from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import "../styles/Dashboard.css";
import fisica from "../assets/seguridad fisica.jpg";
import electronica from "../assets/seguridad electronica.jpg";
import canina from "../assets/seguridad canina.png";
import vip from "../assets/Escolta Vip.jpg";
import mercancias from "../assets/Escolta de mercancias.jpg";
import supervisor from "../assets/Supervisor de Seguridad.png";
import { getGreeting, formatDate } from "../utils/formatters";

function Dashboard() {
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
      icon: "📄",
      description: "Accede a certificados, órdenes y comprobantes de forma rápida.",
      to: "/documentos",
    },
    {
      title: "Empleados",
      icon: "👥",
      description: "Administra el personal y su información operativa.",
      to: "/empleados",
    },
    {
      title: "Solicitudes",
      icon: "📬",
      description: "Gestiona solicitudes internas con control y trazabilidad.",
      to: "/solicitudes",
    },
  ];

  return (
    <>
      <Header />
      <main className="dashboard-container">
        <section className="welcome">
          <div>
            <p className="welcome-eyebrow">Panel principal</p>
            <h1>{getGreeting()}, bienvenido a SESHA APP</h1>
            <p>
              Plataforma integral para la gestión de seguridad y operación del equipo.
              <span> {formatDate()}</span>
            </p>
          </div>
          <div className="welcome-badge">Operación en tiempo real</div>
        </section>

        <section className="cards">
          {services.map((service, index) => (
            <article className="service-card" key={index}>
              <img src={service.image} alt={service.title} />
              <div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="modules">
          {quickModules.map((module) => (
            <Link to={module.to} className="module-box" key={module.title}>
              <h3>
                {module.icon} {module.title}
              </h3>
              <p>{module.description}</p>
            </Link>
          ))}
        </section>
      </main>
    </>
  );
}

export default Dashboard;
