import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Documentos from "../pages/Documentos";

test("Renderiza correctamente el módulo Documentos", () => {
  render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Documentos />
    </BrowserRouter>
  );
});
