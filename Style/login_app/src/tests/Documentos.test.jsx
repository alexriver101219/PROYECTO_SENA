import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Documentos from "../pages/Documentos";

test("Renderiza correctamente el módulo Documentos", () => {
  render(
    <BrowserRouter>
    <Documentos />
    </BrowserRouter>
  );
});