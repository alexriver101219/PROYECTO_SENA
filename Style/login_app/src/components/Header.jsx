import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/Sesha_logo.png";
import "../styles/Header.css";

function Header() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <header className="header">
      <div className="header-left">
        <img src={logo} alt="SESHA APP" className="header-logo" />
        <div>
          <h2>SESHA APP</h2>
          <p>Gestión integral de seguridad</p>
        </div>
      </div>

      <div className="header-right">
        <span className="header-status">● En línea</span>
        <button onClick={logout}>Cerrar sesión</button>
      </div>
    </header>
  );
}


export default Header;