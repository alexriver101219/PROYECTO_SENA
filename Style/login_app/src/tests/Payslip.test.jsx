import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Documentos from "../pages/Documentos";
import PayslipSection from "../components/PayslipSection";
import { AuthContext } from "../context/AuthContext";
import api, { downloadPayslip } from "../services/api";
import { todayInBogota } from "../utils/formatters";
import { latestClosedFortnight, fortnightEnd } from "../utils/payrollPeriods";

test("Documentos discrimina devengado y descuentos conservando el total y descarga el mes seleccionado", async () => {
  downloadPayslip.mockResolvedValue();
  render(<Documentos />);
  await screen.findByText(/2\.600\.000/);
  for (const header of ["Devengado", "Deducciones", "Total a pagar"])
    expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
  expect(screen.getByRole("rowheader", { name: "Salud (2 %)" })).toBeInTheDocument();
  expect(screen.getByRole("rowheader", { name: "Pensión (2 %)" })).toBeInTheDocument();
  expect(screen.getAllByText(/1\.354\.166/)).toHaveLength(2);
  expect(screen.getAllByText(/27\.083/)).toHaveLength(2);
  expect(screen.getByText(/^\$\s*54\.166$/u)).toBeInTheDocument();
  expect(screen.getByText(/1\.300\.000/)).toBeInTheDocument();
  expect(screen.getByText(/Bancolombia/)).toBeInTheDocument();
  expect(screen.queryByText(/2\.392\.000/)).not.toBeInTheDocument();
  const { period, half } = latestClosedFortnight();
  await userEvent.setup().click(screen.getByRole("button", { name: "Descargar desprendible de nómina" }));
  expect(downloadPayslip).toHaveBeenCalledWith(period, half);
  expect(await screen.findByText("Descarga del desprendible iniciada.")).toBeInTheDocument();
});

test("cambiar período deshabilita la descarga hasta recibir la nueva liquidación y descarta respuestas antiguas", async () => {
  let resolveOld, resolveNew;
  api.get.mockImplementation(() => new Promise((resolve) => { if (!resolveOld) resolveOld = resolve; else resolveNew = resolve; }));
  render(<PayslipSection />);
  fireEvent.change(screen.getByLabelText("Período de nómina"), { target: { value: "2026-10" } });
  expect(screen.getByRole("button", { name: "Descargar desprendible de nómina" })).toBeDisabled();
  const details = { period: "2026-10", half: "2", periodStart: "2026-10-16", periodEnd: "2026-10-31", monthlyNet: 3200000,
    gross: 1666666, health: 33333, pension: 33333, deductions: 66666,
    healthPercent: 2, pensionPercent: 2, net: 1600000, deductionStatus: "Salud y pensión descontadas en esta quincena",
    payment: { method: "Transferencia bancaria", bank: "Bancolombia" },
    schedule: { code: "2x2x2", label: "Turnos" }, scopeNote: "Neto mensual" };
  resolveNew({ data: details });
  await screen.findByText(/3\.200\.000/);
  resolveOld({ data: { ...details, period: "2026-11", half: "1", monthlyNet: 2600000, net: 1300000 } });
  await waitFor(() => expect(screen.getByRole("button", { name: "Descargar desprendible de nómina" })).toBeEnabled());
  expect(screen.queryByText(/2\.600\.000/)).not.toBeInTheDocument();
});

test("elige la última quincena cerrada y deshabilita la segunda cuando aún no finaliza", async () => {
  render(<PayslipSection />);
  await screen.findByText(/1\.300\.000/);
  const today = todayInBogota(), latest = latestClosedFortnight(today);
  expect(screen.getByLabelText("Período de nómina")).toHaveValue(latest.period);
  expect(screen.getByLabelText("Quincena")).toHaveValue(latest.half);
  const option = screen.getByRole("option", { name: /Segunda quincena/ });
  expect(option.disabled).toBe(fortnightEnd(latest.period, "2") > today);
  expect(latestClosedFortnight("2026-11-14")).toEqual({ period: "2026-10", half: "2" });
  expect(latestClosedFortnight("2026-11-15")).toEqual({ period: "2026-11", half: "1" });
  expect(latestClosedFortnight("2026-11-30")).toEqual({ period: "2026-11", half: "2" });
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
