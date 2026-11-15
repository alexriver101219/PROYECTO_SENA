import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Documentos from "../pages/Documentos";
import PayslipSection from "../components/PayslipSection";
import { AuthContext } from "../context/AuthContext";
import api, { downloadPayslip } from "../services/api";
import { todayInBogota } from "../utils/formatters";

test("Documentos muestra el neto sin otro descuento y descarga el mes seleccionado", async () => {
  downloadPayslip.mockResolvedValue();
  render(<Documentos />);
  await screen.findByText(/2\.600\.000/);
  expect(screen.getByText("Salud y pensión ya descontadas")).toBeInTheDocument();
  expect(screen.queryByText(/2\.392\.000/)).not.toBeInTheDocument();
  const period = todayInBogota().slice(0, 7);
  await userEvent.setup().click(screen.getByRole("button", { name: "Descargar desprendible de nómina" }));
  expect(downloadPayslip).toHaveBeenCalledWith(period);
  expect(await screen.findByText("Descarga del desprendible iniciada.")).toBeInTheDocument();
});

test("cambiar período deshabilita la descarga hasta recibir la nueva liquidación y descarta respuestas antiguas", async () => {
  let resolveOld, resolveNew;
  api.get.mockImplementation(() => new Promise((resolve) => { if (!resolveOld) resolveOld = resolve; else resolveNew = resolve; }));
  render(<PayslipSection />);
  fireEvent.change(screen.getByLabelText("Período de nómina"), { target: { value: "2026-10" } });
  expect(screen.getByRole("button", { name: "Descargar desprendible de nómina" })).toBeDisabled();
  const details = { period: "2026-10", net: 3200000, deductionStatus: "Salud y pensión ya descontadas", schedule: { code: "2x2x2", label: "Turnos" }, scopeNote: "Neto mensual" };
  resolveNew({ data: details });
  await screen.findByText(/3\.200\.000/);
  resolveOld({ data: { ...details, period: "2026-11", net: 2600000 } });
  await waitFor(() => expect(screen.getByRole("button", { name: "Descargar desprendible de nómina" })).toBeEnabled());
  expect(screen.queryByText(/2\.600\.000/)).not.toBeInTheDocument();
});

test("un error de descarga no anuncia éxito ni duplica solicitudes mientras genera", async () => {
  let rejectDownload;
  downloadPayslip.mockImplementation(() => new Promise((_resolve, reject) => { rejectDownload = reject; }));
  render(<PayslipSection />);
  await screen.findByText(/2\.600\.000/);
  await userEvent.setup().dblClick(screen.getByRole("button", { name: "Descargar desprendible de nómina" }));
  expect(downloadPayslip).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "Generando desprendible…" })).toBeDisabled();
  rejectDownload({ response: { data: { message: "Perfil pendiente de revisión" } } });
  expect(await screen.findByRole("alert")).toHaveTextContent("Perfil pendiente de revisión");
  expect(screen.queryByText("Descarga del desprendible iniciada.")).not.toBeInTheDocument();
});

test("error de asignación salarial ofrece reintento y un administrador no consulta nómina propia", async () => {
  api.get.mockRejectedValueOnce({ response: { data: { message: "El cargo necesita una asignación salarial" } } });
  const view = render(<PayslipSection />);
  expect(await screen.findByRole("alert")).toHaveTextContent("El cargo necesita una asignación salarial");
  expect(screen.getByRole("button", { name: "Descargar desprendible de nómina" })).toBeDisabled();
  await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar consulta de nómina" }));
  await screen.findByText(/2\.600\.000/);
  view.unmount();
  api.get.mockClear();
  render(<AuthContext.Provider value={{ user: { role: "admin" } }}><PayslipSection /></AuthContext.Provider>);
  expect(screen.queryByText("Desprendible de nómina")).not.toBeInTheDocument();
  expect(api.get).not.toHaveBeenCalled();
});
