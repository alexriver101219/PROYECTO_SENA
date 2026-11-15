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
  const newPositions = [
    "Escolta de mercancías", "Escolta VIP", "Operador de medios tecnológicos",
    "Coordinador de escoltas", "Técnico de medios tecnológicos",
    "Supervisor de medios tecnológicos", "Guarda canino", "Auxiliar de almacén",
  ];
  api.get.mockImplementation((path) => path === "/auth/positions"
    ? Promise.resolve({ data: newPositions.map(position => ({ position })) })
    : path === "/auth/registration" ? Promise.resolve({ data: { enabled: true } })
    : Promise.reject({ response: { status: 401 } }));
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
  for (const position of newPositions)
    expect(await screen.findByRole("option", { name: position })).toBeInTheDocument();
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/nombre completo/i), "Ana Díaz");
  await user.type(screen.getByLabelText(/correo/i), "ana.diaz@sesha.com");
  await user.selectOptions(
    screen.getByLabelText("Cargo"),
    "Auxiliar de almacén",
  );
  await user.type(screen.getByLabelText(/^contraseña/i), "test-only-fixture-1-credentials");
  await user.type(screen.getByLabelText(/confirmar contraseña/i), "test-only-fixture-1-credentials");
  await user.click(screen.getByRole("button", { name: /registrarse/i }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith("/auth/register", {
      name: "Ana Díaz",
      email: "ana.diaz@sesha.com",
      password: "test-only-fixture-1-credentials",
      position: "Auxiliar de almacén",
    }),
  );
  expect(screen.getByTestId("identity")).toHaveTextContent("Ana Díaz");
  expect(localStorage.getItem("token")).toBeNull();
  expect(localStorage.getItem("user")).toBeNull();
});

test("registro cerrado explica el alta por administrador y no muestra campos de contraseña", async () => {
  api.get.mockResolvedValue({ data: { enabled: false } });
  render(<MemoryRouter><AuthProvider><Register /></AuthProvider></MemoryRouter>);
  expect(await screen.findByText(/el administrador debe crear tu cuenta/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/^contraseña/i)).not.toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});
