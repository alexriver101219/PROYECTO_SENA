import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Login from "../pages/Login";
import { AuthProvider } from "../context/AuthContext";
import api from "../services/api";

const current = "test-only-web-current-credential";
const replacement = "test-only-web-replacement-credential";
function page() {
  render(<MemoryRouter><AuthProvider><Login /></AuthProvider></MemoryRouter>);
  return userEvent.setup();
}
async function completeForm(user, confirmation = replacement) {
  await user.type(screen.getByLabelText(/^correo electrónico$/i), "admin@sesha.com");
  await user.type(screen.getByLabelText(/^contraseña actual$/i), current);
  await user.type(screen.getByLabelText(/^nueva contraseña$/i), replacement);
  await user.type(screen.getByLabelText(/^confirmar nueva contraseña$/i), confirmation);
}

test("botón inferior abre el formulario y el cambio confirmado vuelve al login sin guardar claves", async () => {
  const user = page();
  api.post.mockResolvedValue({ data: { success: true } });
  await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
  expect(screen.getByRole("heading", { name: "Cambiar contraseña" })).toBeInTheDocument();
  await completeForm(user);
  for (const label of [/^contraseña actual$/i, /^nueva contraseña$/i, /^confirmar nueva contraseña$/i])
    expect(screen.getByLabelText(label)).toHaveAttribute("type", "password");
  await user.click(screen.getByRole("button", { name: "Guardar nueva contraseña" }));
  expect(api.post).toHaveBeenCalledWith("/auth/change-password", {
    email: "admin@sesha.com", currentPassword: current, newPassword: replacement, confirmPassword: replacement,
  });
  expect(await screen.findByRole("status")).toHaveTextContent("Contraseña actualizada");
  expect(screen.getByRole("button", { name: /entrar al sistema/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/^contraseña$/i)).toHaveValue("");
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
});

test("confirmación distinta muestra un error sin enviar peticiones", async () => {
  const user = page();
  await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
  await completeForm(user, "test-only-wrong-confirmation");
  await user.click(screen.getByRole("button", { name: "Guardar nueva contraseña" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("confirmación");
  expect(api.post).not.toHaveBeenCalled();
});

test("fallo del servidor se muestra sin anunciar éxito y vacía los campos secretos", async () => {
  const user = page();
  api.post.mockRejectedValue({ response: { status: 401, data: { message: "Correo o contraseña actual incorrectos" } } });
  await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
  await completeForm(user);
  await user.click(screen.getByRole("button", { name: "Guardar nueva contraseña" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Correo o contraseña actual incorrectos");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByLabelText(/^contraseña actual$/i)).toHaveValue("");
  expect(screen.getByLabelText(/^nueva contraseña$/i)).toHaveValue("");
  expect(screen.getByLabelText(/^confirmar nueva contraseña$/i)).toHaveValue("");
});

test("puede cancelar y no duplica la petición mientras está guardando", async () => {
  const user = page();
  await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
  await user.click(screen.getByRole("button", { name: "Volver a iniciar sesión" }));
  expect(screen.getByRole("button", { name: /entrar al sistema/i })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
  await completeForm(user);
  let finish;
  api.post.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const submit = screen.getByRole("button", { name: "Guardar nueva contraseña" });
  await user.dblClick(submit);
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  finish({ data: { success: true } });
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Contraseña actualizada"));
});
