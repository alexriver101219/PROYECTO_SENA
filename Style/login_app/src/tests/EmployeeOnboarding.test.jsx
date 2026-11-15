import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Empleados from "../pages/Empleados";
import api from "../services/api";

test("alta administrativa captura la clave enmascarada, la envía solo al guardar y la elimina tras respuesta", async () => {
  api.post.mockRejectedValue({ response: { data: { message: "Documento ya registrado" } } });
  render(<Empleados />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Nuevo empleado" }));
  await user.type(screen.getByLabelText("Nombre completo"), "Ana Verificada");
  await user.type(screen.getByLabelText("Documento"), "1001234567");
  await user.type(screen.getByLabelText("Cargo"), "Supervisora");
  await user.type(screen.getByLabelText("Departamento"), "Operaciones");
  await user.type(screen.getByLabelText(/correo de la cuenta/i), "ana@sesha.com");
  await user.type(screen.getByLabelText("Fecha de ingreso"), "2024-01-02");
  await user.click(screen.getByLabelText(/crear también su cuenta/i));
  const password = screen.getByLabelText(/contraseña inicial/i);
  expect(password).toHaveAttribute("type", "password");
  await user.type(password, "test-only-onboarding-credential");
  expect(api.post).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Guardar" }));
  await screen.findByText("Documento ya registrado");
  await waitFor(() => expect(password).toHaveValue(""));
  expect(api.post).toHaveBeenCalledWith("/empleados", expect.objectContaining({ initialPassword: "test-only-onboarding-credential" }));
  expect(localStorage.length).toBe(0);
});
