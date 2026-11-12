import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Login from "../pages/Login";
import { AuthProvider } from "../context/AuthContext";
import api from "../services/api";
test("login presenta el error real y no inicia una sesión fallida", async () => {
  api.post.mockRejectedValue({
    response: {
      status: 401,
      data: { message: "Correo o contraseña incorrectos" },
    },
  });
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/correo/i), "admin@sesha.com");
  await user.type(screen.getByLabelText(/^contraseña/i), "654321");
  await user.click(screen.getByRole("button", { name: /entrar al sistema/i }));
  await waitFor(() =>
    expect(
      screen.getByText("Correo o contraseña incorrectos"),
    ).toBeInTheDocument(),
  );
  expect(localStorage.getItem("token")).toBeNull();
});
