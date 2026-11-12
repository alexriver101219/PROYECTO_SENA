import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
function renderDashboard() {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthContext.Provider value={{ user: { name: "Ana", role: "employee" } }}>
        <Dashboard />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}
test("muestra métricas de API y oculta administración a empleados", async () => {
  api.get.mockResolvedValue({
    data: { documentos: 4, solicitudes: 8, pendientes: 2 },
  });
  renderDashboard();
  expect(await screen.findByText("8")).toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: /empleados/i }),
  ).not.toBeInTheDocument();
});
test("despliega detalles del servicio seleccionado", async () => {
  renderDashboard();
  await screen.findAllByText("0");
  fireEvent.click(
    screen.getByRole("button", { name: /ver detalles de escolta vip/i }),
  );
  expect(
    screen.getByText(/servicio de protección personal diseñado/i),
  ).toBeInTheDocument();
  await screen.findAllByText("0");
});
