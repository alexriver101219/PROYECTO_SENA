import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Dashboard from "../pages/Dashboard";

test("Renderiza correctamente el Dashboard", () => {
  render(
    <BrowserRouter>
    <Dashboard />
    </BrowserRouter>
  );
});