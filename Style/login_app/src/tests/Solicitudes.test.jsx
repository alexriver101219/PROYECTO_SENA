import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Solicitudes from "../pages/Solicitudes";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
test("una solicitud fallida conserva el motivo y nunca simula éxito", async () => {
  api.post.mockRejectedValue({
    response: { data: { message: "No se pudo guardar" } },
  });
  render(
    <AuthContext.Provider value={{ user: { role: "employee" } }}>
      <Solicitudes />
    </AuthContext.Provider>,
  );
  await screen.findByText("No hay solicitudes registradas.");
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Motivo"), "Permiso para cita médica");
  await user.click(screen.getByRole("button", { name: /enviar solicitud/i }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar"),
  );
  expect(screen.getByLabelText("Motivo")).toHaveValue(
    "Permiso para cita médica",
  );
  expect(
    screen.queryByText("Solicitud radicada y guardada."),
  ).not.toBeInTheDocument();
});
