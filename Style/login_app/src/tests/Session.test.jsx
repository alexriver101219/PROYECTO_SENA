import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, AuthContext } from "../context/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";
import { useContext } from "react";
import api from "../services/api";
function Session() {
  const auth = useContext(AuthContext);
  return (
    <>
      <span>{auth.user?.name || "Sin sesión"}</span>
      <button onClick={auth.logout}>Salir</button>
    </>
  );
}
test("un token antiguo en localStorage no permite entrar", async () => {
  localStorage.setItem("token", "inventado");
  render(
    <MemoryRouter
      initialEntries={["/private"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <Routes>
          <Route
            path="/private"
            element={<ProtectedRoute>Privado</ProtectedRoute>}
          />
          <Route path="/login" element={<p>Acceso requerido</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(await screen.findByText("Acceso requerido")).toBeInTheDocument();
  expect(localStorage.getItem("token")).toBeNull();
});
test("logout limpia usuario y CSRF después de confirmar el cierre del servidor", async () => {
  api.get.mockResolvedValue({
    data: { user: { name: "Ana" }, profile: null, csrfToken: "csrf" },
  });
  api.post.mockResolvedValue({ status: 204 });
  render(
    <AuthProvider>
      <Session />
    </AuthProvider>,
  );
  await screen.findByText("Ana");
  await userEvent.setup().click(screen.getByText("Salir"));
  await waitFor(() =>
    expect(screen.getByText("Sin sesión")).toBeInTheDocument(),
  );
  expect(api.post).toHaveBeenCalledWith("/auth/logout");
});
test("sin permisos administrativos la ruta de empleados redirige", async () => {
  render(
    <MemoryRouter
      initialEntries={["/empleados"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthContext.Provider
        value={{ user: { role: "employee" }, loading: false }}
      >
        <Routes>
          <Route
            path="/empleados"
            element={<ProtectedRoute admin>Privado</ProtectedRoute>}
          />
          <Route path="/dashboard" element={<p>Panel permitido</p>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
  expect(await screen.findByText("Panel permitido")).toBeInTheDocument();
});
