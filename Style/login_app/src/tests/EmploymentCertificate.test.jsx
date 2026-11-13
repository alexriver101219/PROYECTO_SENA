import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Documentos from "../pages/Documentos";
import Perfil from "../pages/Perfil";
import { AuthContext } from "../context/AuthContext";
import { downloadEmploymentCertificate } from "../services/api";

test("Documentos solicita la constancia laboral personalizada", async () => {
  downloadEmploymentCertificate.mockResolvedValue();
  render(<Documentos />);
  await screen.findByText("No hay documentos guardados.");
  await userEvent
    .setup()
    .click(
      screen.getByRole("button", { name: "Descargar constancia laboral" }),
    );
  expect(downloadEmploymentCertificate).toHaveBeenCalledOnce();
  expect(screen.queryByText("Constancia académica")).not.toBeInTheDocument();
});

test("Mi perfil muestra fecha de ingreso y usa el mismo generador", async () => {
  downloadEmploymentCertificate.mockResolvedValue();
  const auth = {
    user: { name: "Laura Gómez", role: "employee" },
    profile: {
      document: "1012345678",
      position: "Supervisora",
      department: "Operaciones",
      status: "Activo",
      hireDate: "2021-03-15",
    },
    refresh: vi.fn(),
  };
  render(
    <AuthContext.Provider value={auth}>
      <Perfil />
    </AuthContext.Provider>,
  );
  expect(screen.getByText("Fecha de ingreso")).toBeInTheDocument();
  expect(screen.getByText("15 de marzo de 2021")).toBeInTheDocument();
  await userEvent
    .setup()
    .click(
      screen.getByRole("button", { name: "Descargar constancia laboral" }),
    );
  expect(downloadEmploymentCertificate).toHaveBeenCalledOnce();
});
