import React from "react";
import { Link } from "react-router-dom";

import logo from "../assets/Sesha_logo.png";
import fondo from "../assets/fondo.png";

import fisica from "../assets/seguridad fisica.jpg";
import electronica from "../assets/seguridad electronica.jpg";
import canina from "../assets/seguridad canina.png";
import vip from "../assets/Escolta Vip.jpg";
import mercancias from "../assets/Escolta de mercancias.jpg";
import supervisor from "../assets/Supervisor de Seguridad.png";

import "../styles/LandingPage.css";

function LandingPage() {
  return (
    <div>
      {/* 🔹 Navbar con video al extremo derecho */}
      <nav className="navbar">
        {/* Logo a la izquierda */}
        <img src={logo} alt="SESHA APP" className="navbar-logo" />

        {/* Botones en el centro */}
        <ul className="navbar-links">
          <li><Link to="/" className="btn-nav btn-inicio">Inicio</Link></li>
          <li><Link to="/login" className="btn-nav btn-login">Login</Link></li>
          <li><Link to="/register" className="btn-nav btn-registro">Registro</Link></li>
        </ul>

        {/* Video al extremo derecho */}
        <div className="navbar-video">
          <video controls>
            <source src="/sesha_demo.mp4" type="video/mp4" />
            Tu navegador no soporta la reproducción de video.
          </video>
        </div>
      </nav>

      {/* 🔹 Hero */}
      <header
        className="hero"
        style={{ backgroundImage: `url(${fondo})` }}
      >
        <div className="overlay">
          <img src={logo} alt="SESHA APP" className="logo" />
          <h1>SESHA APP</h1>
          <p>Plataforma Integral de Gestión para Empresas de Seguridad Privada</p>

          <div className="hero-buttons">
            <Link to="/login" className="btn-primary">Ingresar al Sistema</Link>
            <Link to="/register" className="btn-primary">Crear cuenta</Link>
          </div>
        </div>
      </header>

      {/* 🔹 Servicios */}
      <section className="services">
        <h2>Nuestros Servicios</h2>
        <div className="cards">
          <div className="card"><img src={fisica} alt="Seguridad Física" /><h3>Seguridad Física</h3></div>
          <div className="card"><img src={electronica} alt="Seguridad Electrónica" /><h3>Seguridad Electrónica</h3></div>
          <div className="card"><img src={canina} alt="Seguridad Canina" /><h3>Seguridad Canina</h3></div>
          <div className="card"><img src={vip} alt="Escolta VIP" /><h3>Escolta VIP</h3></div>
          <div className="card"><img src={mercancias} alt="Escolta de Mercancías" /><h3>Escolta de Mercancías</h3></div>
          <div className="card"><img src={supervisor} alt="Supervisor de Seguridad" /><h3>Supervisor de Seguridad</h3></div>
        </div>
      </section>

      {/* 🔹 Footer */}
      <footer className="footer">
        <p>© 2026 SESHA APP</p>
        <p>Contáctanos: info@sesha.com | +57 300 000 0000</p>
      </footer>
    </div>
  );
}

export default LandingPage;
