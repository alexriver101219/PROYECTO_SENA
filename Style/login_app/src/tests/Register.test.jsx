import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Register from "../pages/Register";
import { AuthProvider, AuthContext } from "../context/AuthContext";
import { useContext } from "react";
import api from "../services/api";
function Identity() {
  return (
    <p data-testid="identity">
      {useContext(AuthContext).user?.name || "Sin sesión"}
    </p>
  );
}
test("registro actualiza sesión y no guarda credenciales en localStorage", async () => {
  api.post.mockResolvedValue({
    data: {
      user: { name: "Ana Díaz", email: "ana.diaz@sesha.com", role: "employee" },
      csrfToken: "csrf-demo",
    },
  });
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <Register />
        <Identity />
      </AuthProvider>
    </MemoryRouter>,
  );
  await screen.findByText("Sin sesión");
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/nombre completo/i), "Ana Díaz");
  await user.type(screen.getByLabelText(/correo/i), "ana.diaz@sesha.com");
  await user.type(screen.getByLabelText(/^contraseña/i), "Sesha2026!");
  await user.type(screen.getByLabelText(/confirmar contraseña/i), "Sesha2026!");
  await user.click(screen.getByRole("button", { name: /registrarse/i }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith("/auth/register", {
      name: "Ana Díaz",
      email: "ana.diaz@sesha.com",
      password: "Sesha2026!",
    }),
  );
  expect(screen.getByTestId("identity")).toHaveTextContent("Ana Díaz");
  expect(localStorage.getItem("token")).toBeNull();
  expect(localStorage.getItem("user")).toBeNull();
});
