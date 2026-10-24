import { fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Dashboard from "../pages/Dashboard";

test("Renderiza correctamente el Dashboard", () => {
  render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Dashboard />
    </BrowserRouter>
  );

  expect(screen.getByText(/panel principal/i)).toBeInTheDocument();
});

test("Despliega la definición y características del servicio seleccionado", () => {
  render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Dashboard />
    </BrowserRouter>
  );

  fireEvent.click(screen.getByRole("button", { name: /ver detalles de escolta vip/i }));

  expect(
    screen.getByText(/servicio de protección personal diseñado/i)
  ).toBeInTheDocument();
  expect(screen.getByText("Análisis y evaluación de riesgos")).toBeInTheDocument();
});
