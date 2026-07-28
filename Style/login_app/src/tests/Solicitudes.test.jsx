import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Solicitudes from "../pages/Solicitudes";

test("Renderiza correctamente el módulo Solicitudes", () => {
  render(
    <BrowserRouter>
    <Solicitudes />
    </BrowserRouter>
  );
});