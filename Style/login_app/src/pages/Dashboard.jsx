import React from "react";

import Header from "../components/Header";

import "../styles/Dashboard.css";


import fisica from "../assets/seguridad fisica.jpg";
import electronica from "../assets/seguridad electronica.jpg";
import canina from "../assets/seguridad canina.png";
import vip from "../assets/Escolta Vip.jpg";
import mercancias from "../assets/Escolta de mercancias.jpg";
import supervisor from "../assets/Supervisor de Seguridad.png";


function Dashboard() {


  const services = [
    {
      title: "Seguridad Física",
      image: fisica,
      description:
        "Control y protección de instalaciones."
    },

    {
      title: "Seguridad Electrónica",
      image: electronica,
      description:
        "Monitoreo y sistemas tecnológicos."
    },

    {
      title: "Seguridad Canina",
      image: canina,
      description:
        "Unidades caninas especializadas."
    },

    {
      title: "Escolta VIP",
      image: vip,
      description:
        "Protección personalizada."
    },

    {
      title: "Escolta de Mercancías",
      image: mercancias,
      description:
        "Acompañamiento seguro de cargas."
    },

    {
      title: "Supervisión",
      image: supervisor,
      description:
        "Gestión operativa del personal."
    }
  ];



  return (

    <>

      <Header />


      <main className="dashboard-container">


        <section className="welcome">

          <h1>
            Bienvenido a SESHA APP
          </h1>

          <p>
            Plataforma integral para gestión
            de empleados de seguridad.
          </p>

        </section>



        <section className="cards">


          {services.map((service,index)=>(


            <article
              className="service-card"
              key={index}
            >

              <img
                src={service.image}
                alt={service.title}
              />


              <div>

                <h3>
                  {service.title}
                </h3>


                <p>
                  {service.description}
                </p>


              </div>


            </article>


          ))}


        </section>



        <section className="modules">


          <div className="module-box">

            <h3>
              📄 Documentos
            </h3>

            <p>
              Descarga certificados,
              comprobantes y archivos.
            </p>

          </div>



          <div className="module-box">

            <h3>
              👥 Empleados
            </h3>

            <p>
              Administración del personal.
            </p>

          </div>



          <div className="module-box">

            <h3>
              📬 Solicitudes
            </h3>

            <p>
              Gestión de solicitudes internas.
            </p>

          </div>


        </section>


      </main>

    </>

  );

}


export default Dashboard;