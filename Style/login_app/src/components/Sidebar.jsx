import React from "react";
import { NavLink } from "react-router-dom";
import "../styles/Sidebar.css";

const links = [
  { to: "/dashboard", label: "Inicio", icon: "▣" },
  { to: "/empleados", label: "Empleados", icon: "👥" },
  { to: "/documentos", label: "Documentos", icon: "📄" },
  { to: "/solicitudes", label: "Solicitudes", icon: "📬" },
  { to: "/perfil", label: "Perfil", icon: "⚙️" },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>Menú principal</h3>
        <p>Gestión operativa</p>
      </div>
      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <span>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
