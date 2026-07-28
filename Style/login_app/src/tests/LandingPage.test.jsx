import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import LandingPage from "../pages/LandingPage";

test("Renderiza correctamente la Landing Page", () => {
  render(
    <BrowserRouter>
    <LandingPage />
    </BrowserRouter>
  );
});