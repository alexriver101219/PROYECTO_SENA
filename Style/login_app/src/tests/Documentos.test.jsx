import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Documentos from "../pages/Documentos";
import { uploadPDF } from "../services/api";
test("no anuncia carga exitosa si falla la persistencia", async () => {
  uploadPDF.mockRejectedValue({
    response: { data: { message: "Base no disponible" } },
  });
  render(<Documentos />);
  await screen.findByText("No hay documentos guardados.");
  const user = userEvent.setup();
  await user.upload(
    screen.getByLabelText(/adjuntar PDF/i),
    new File(["%PDF-1.4"], "prueba.pdf", { type: "application/pdf" }),
  );
  await user.click(screen.getByRole("button", { name: /guardar documento/i }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("Base no disponible"),
  );
  expect(
    screen.queryByText("Documento guardado correctamente."),
  ).not.toBeInTheDocument();
});
