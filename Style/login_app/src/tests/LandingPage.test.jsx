import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import LandingPage from "../pages/LandingPage";

test("Renderiza correctamente la Landing Page", () => {
  render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LandingPage />
    </BrowserRouter>
  );

  const video = screen.getByLabelText(/demostración de sesha app/i);
  expect(video).toHaveAttribute("autoplay");
  expect(video).toHaveAttribute("loop");
  expect(video.muted).toBe(true);
  expect(video).toHaveAttribute("playsinline");
  expect(video).toHaveAttribute("controls");
});
