import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Solicitudes from "../pages/Solicitudes";

test("Renderiza correctamente el módulo Solicitudes", () => {
  render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Solicitudes />
    </BrowserRouter>
  );
});
