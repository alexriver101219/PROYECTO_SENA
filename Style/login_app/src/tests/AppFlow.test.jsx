import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { AuthProvider } from "../context/AuthContext";
import api from "../services/api";
import ErrorBoundary from "../components/ErrorBoundary";

test("el ingreso abre el panel completo con su navegación", async () => {
  window.history.replaceState({}, "", "/login");
  api.post.mockResolvedValue({
    data: {
      user: { name: "Administrador", email: "admin@sesha.com", role: "admin" },
      csrfToken: "test-csrf",
    },
  });
  render(
    <AuthProvider>
      <App />
    </AuthProvider>,
  );
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText(/correo electrónico/i),
    "admin@sesha.com",
  );
  await user.type(screen.getByLabelText(/^contraseña/i), "123456");
  await user.click(screen.getByRole("button", { name: /entrar al sistema/i }));
  expect(await screen.findByText("Panel principal")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Cerrar sesión" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("navigation", { name: "Navegación principal" }),
  ).toBeInTheDocument();
});

test("un error de render muestra una recuperación en lugar de dejar la página vacía", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({}));
  const expectedError = (event) => {
    if (event.error?.message === "Fallo de prueba de interfaz")
      event.preventDefault();
  };
  window.addEventListener("error", expectedError);
  function BrokenPage() {
    throw new Error("Fallo de prueba de interfaz");
  }
  try {
    render(
      <ErrorBoundary>
        <BrokenPage />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudo mostrar esta pantalla",
    );
    expect(
      screen.getByRole("button", { name: "Recargar" }),
    ).toBeInTheDocument();
  } finally {
    window.removeEventListener("error", expectedError);
    log.mockRestore();
    vi.unstubAllGlobals();
  }
});
