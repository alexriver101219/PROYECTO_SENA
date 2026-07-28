import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Login from "../pages/Login";

test("Renderiza correctamente la página Login", () => {
  render(
    <BrowserRouter>
    <Login />
    </BrowserRouter>
  );
});