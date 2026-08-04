import React from "react";
import Header from "../components/Header";

function MainLayout({ title, subtitle, children }) {
  return (
    <>
      <Header />
      <main className="dashboard-container">
        {(title || subtitle) && (
          <section className="welcome">
            {title && <h1>{title}</h1>}
            {subtitle && <p>{subtitle}</p>}
          </section>
        )}
        {children}
      </main>
    </>
  );
}

export default MainLayout;
