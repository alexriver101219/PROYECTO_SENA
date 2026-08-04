import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Register from "../pages/Register";
import api from "../services/api";

jest.mock("../services/api", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

describe("Register page", () => {
  beforeEach(() => {
    localStorage.clear();
    api.post.mockReset();
  });

  test("envía el registro al backend y guarda el token", async () => {
    api.post.mockResolvedValue({
      data: {
        token: "token-demo",
        user: { name: "Ana Díaz", email: "ana.diaz@sesha.com" },
      },
    });

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/nombre completo/i), "Ana Díaz");
    await userEvent.type(screen.getByLabelText(/correo/i), "ana.diaz@sesha.com");
    await userEvent.type(screen.getByLabelText(/^contraseña/i), "Sesha2026!");
    await userEvent.type(screen.getByLabelText(/confirmar contraseña/i), "Sesha2026!");
    await userEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/auth/register", {
      name: "Ana Díaz",
      email: "ana.diaz@sesha.com",
      password: "Sesha2026!",
    }));

    await waitFor(() => expect(localStorage.getItem("token")).toBe("token-demo"));
  });
});
