import { useState } from "react";
import { servicios } from "../data/servicios";
import fisica from "../assets/seguridad fisica.jpg";
import electronica from "../assets/seguridad electronica.jpg";
import canina from "../assets/seguridad canina.png";
import vip from "../assets/Escolta Vip.jpg";
import mercancias from "../assets/Escolta de mercancias.jpg";
import supervisor from "../assets/Supervisor de Seguridad.png";

const imagenesPorServicio = {
  1: mercancias,
  2: vip,
  3: canina,
  4: electronica,
  5: fisica,
  6: supervisor,
};

function Servicios({ compact = false }) {
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);

  const alternarDetalles = (id) => {
    setServicioSeleccionado((seleccionado) => (seleccionado === id ? null : id));
  };

  return (
    <div
      className={
        compact
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"
          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      }
    >
      {servicios.map((servicio) => {
        const detallesId = `servicio-${servicio.id}-detalles`;
        const detallesAbiertos = servicioSeleccionado === servicio.id;

        return (
          <article
            key={servicio.id}
            className={
              compact
                ? "bg-gradient-to-br from-slate-800 to-slate-900 glass-card rounded-xl p-2.5 flex flex-wrap items-center gap-3.5 text-slate-100"
                : "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition"
            }
          >
            <div
              className={
                compact
                  ? "w-16 h-14 rounded-lg bg-slate-950 overflow-hidden flex-shrink-0 border border-slate-700/80 shadow-md"
                  : "h-40 bg-gray-100 overflow-hidden"
              }
            >
              <img
                src={imagenesPorServicio[servicio.id]}
                alt={servicio.nombre}
                className={`w-full h-full object-cover${compact ? " rounded-lg" : ""}`}
              />
            </div>
            <div className={compact ? "flex-1 min-w-0" : "p-4"}>
              <h3
                className={
                  compact
                    ? "text-xs font-extrabold text-white"
                    : "text-sm font-bold text-gray-800"
                }
              >
                {servicio.nombre}
              </h3>
              <button
                type="button"
                aria-expanded={detallesAbiertos}
                aria-controls={detallesId}
                onClick={() => alternarDetalles(servicio.id)}
                className={`mt-2 inline-flex items-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  compact
                    ? "text-teal-300 hover:text-teal-200 focus-visible:outline-teal-300"
                    : "text-blue-700 hover:text-blue-900 focus-visible:outline-blue-700"
                }`}
              >
                {detallesAbiertos ? "Ocultar detalles" : "Ver detalles"}
                <span className="sr-only"> de {servicio.nombre}</span>
              </button>
            </div>
            <div
              id={detallesId}
              hidden={!detallesAbiertos}
              className={
                compact
                  ? "basis-full border-t border-slate-700 pt-3"
                  : "basis-full mt-3 border-t border-gray-100 pt-3"
              }
            >
                <p
                  className={`text-sm leading-relaxed ${
                    compact ? "text-slate-300" : "text-gray-600"
                  }`}
                >
                  {servicio.descripcion}
                </p>
                <h4
                  className={`mt-3 text-sm font-semibold ${
                    compact ? "text-white" : "text-gray-800"
                  }`}
                >
                  Características
                </h4>
                <ul
                  className={`mt-2 list-disc space-y-1 pl-5 text-sm ${
                    compact ? "text-slate-300" : "text-gray-600"
                  }`}
                >
                  {servicio.caracteristicas.map((caracteristica) => (
                    <li key={caracteristica}>{caracteristica}</li>
                  ))}
                </ul>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default Servicios;
