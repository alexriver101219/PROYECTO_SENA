import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import EmployeeRequestForm from "../components/EmployeeRequestForm";
import Solicitudes from "../pages/Solicitudes";
import Documentos from "../pages/Documentos";
import { AuthContext } from "../context/AuthContext";
import api, { uploadPDF } from "../services/api";
import { todayInBogota } from "../utils/formatters";
const employee = { name: "Ana Torres", document: "52418936", email: "ana@sesha.com", position: "Guarda de seguridad", department: "Operaciones" };
const types = ["Día de la familia", "Permiso remunerado", "Permiso no remunerado", "Ajuste de nómina"];
const wrapped = (element, role = "employee") => render(<AuthContext.Provider value={{ user: { role } }}>{element}</AuthContext.Provider>);
async function ready(element = <EmployeeRequestForm />) {
  wrapped(element);
  await screen.findByDisplayValue("Ana Torres");
  return userEvent.setup();
}

test("Documentos incluye datos personales de solo lectura, fecha, cuatro tipos y conserva Examinar independiente", async () => {
  await ready(<Documentos />);
  for (const value of Object.values(employee)) expect(screen.getByDisplayValue(value)).toHaveAttribute("readonly");
  expect(screen.getByLabelText("Fecha de solicitud")).toHaveValue(todayInBogota());
  expect(Array.from(screen.getByLabelText("Tipo de solicitud").options, (option) => option.value)).toEqual(types);
  expect(screen.getByLabelText(/Soporte PDF opcional/)).toHaveAttribute("type", "file");
  expect(screen.getByLabelText("Adjuntar PDF")).toBeInTheDocument();
  expect(screen.getByLabelText("Fecha solicitada para el permiso")).toBeRequired();
  expect(screen.getByLabelText("Fecha solicitada para el permiso")).toHaveAttribute("min", todayInBogota());
});

test("radica el permiso con fecha sin enviar identidad ni fecha de radicación del cliente", async () => {
  const onCreated = vi.fn();
  api.post.mockResolvedValue({ data: { id: "request-1", fechaSolicitud: todayInBogota() } });
  const user = await ready(<EmployeeRequestForm onCreated={onCreated} />);
  await user.selectOptions(screen.getByLabelText("Tipo de solicitud"), "Permiso no remunerado");
  await user.type(screen.getByLabelText("Fecha solicitada para el permiso"), todayInBogota());
  await user.type(screen.getByLabelText("Motivo"), "Permiso por trámite personal");
  await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));
  await screen.findByText(/Solicitud radicada y guardada/);
  expect(api.post).toHaveBeenCalledExactlyOnceWith("/solicitudes", { tipo: "Permiso no remunerado", descripcion: "Permiso por trámite personal", fechaPermiso: todayInBogota() });
  expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: "request-1" }));
  expect(screen.getByLabelText("Motivo")).toHaveValue("");
});

test("al pasar a ajuste muestra N/A, guarda fecha nula y reutiliza soporte si falla la radicación", async () => {
  const user = await ready();
  api.post.mockRejectedValueOnce({ response: { data: { message: "No se pudo guardar" } } }).mockResolvedValueOnce({ data: { id: "request-1" } });
  uploadPDF.mockResolvedValue({ id: "document-1" });
  await user.type(screen.getByLabelText("Fecha solicitada para el permiso"), todayInBogota());
  await user.selectOptions(screen.getByLabelText("Tipo de solicitud"), "Ajuste de nómina");
  expect(screen.getByLabelText("Fecha solicitada para el permiso")).toHaveValue("na");
  expect(screen.getByRole("option", { name: /N\/A/ })).toBeInTheDocument();
  await user.type(screen.getByLabelText("Motivo"), "Revisar valor de la quincena");
  await user.upload(screen.getByLabelText(/Soporte PDF opcional/), new File(["%PDF-1.4"], "soporte.pdf", { type: "application/pdf" }));
  await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar");
  expect(screen.getByLabelText("Motivo")).toHaveValue("Revisar valor de la quincena");
  expect(screen.queryByText(/Solicitud radicada y guardada/)).not.toBeInTheDocument();
  await user.dblClick(screen.getByRole("button", { name: "Enviar solicitud" }));
  await screen.findByText(/Solicitud radicada y guardada/);
  expect(uploadPDF).toHaveBeenCalledTimes(1);
  expect(api.post).toHaveBeenCalledTimes(2);
  expect(api.post).toHaveBeenLastCalledWith("/solicitudes", { tipo: "Ajuste de nómina", descripcion: "Revisar valor de la quincena", fechaPermiso: null, documento: "document-1" });
});

test("un error de perfil impide enviar y permite volver a cargar los datos", async () => {
  api.get.mockRejectedValueOnce({ response: { data: { message: "Perfil incompleto" } } });
  wrapped(<EmployeeRequestForm />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Perfil incompleto");
  expect(screen.getByRole("button", { name: "Enviar solicitud" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Reintentar datos del solicitante" }));
  await screen.findByDisplayValue("Ana Torres");
  expect(screen.getByRole("button", { name: "Enviar solicitud" })).toBeEnabled();
});

test("los clics repetidos durante el envío no duplican la solicitud", async () => {
  let finish;
  api.post.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const user = await ready();
  await user.selectOptions(screen.getByLabelText("Tipo de solicitud"), "Ajuste de nómina");
  await user.type(screen.getByLabelText("Motivo"), "Validar liquidación de quincena");
  await user.dblClick(screen.getByRole("button", { name: "Enviar solicitud" }));
  expect(screen.getByRole("button", { name: "Guardando solicitud…" })).toBeDisabled();
  expect(api.post).toHaveBeenCalledTimes(1);
  await act(async () => finish({ data: { id: "request-1" } }));
  await screen.findByText(/Solicitud radicada y guardada/);
});

test("un soporte que no se pudo guardar impide radicar y conserva el motivo", async () => {
  uploadPDF.mockRejectedValue({ response: { data: { message: "PDF inválido" } } });
  const user = await ready();
  await user.selectOptions(screen.getByLabelText("Tipo de solicitud"), "Ajuste de nómina");
  await user.type(screen.getByLabelText("Motivo"), "Revisar liquidación de quincena");
  await user.upload(screen.getByLabelText(/Soporte PDF opcional/), new File(["%PDF-1.4"], "soporte.pdf", { type: "application/pdf" }));
  await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("PDF inválido");
  expect(api.post).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Motivo")).toHaveValue("Revisar liquidación de quincena");
});

test("el administrador ve datos, fechas y N/A del historial y puede revisar el estado sin crear solicitudes de empleado", async () => {
  const saved = { id: "request-1", tipo: "Ajuste de nómina", descripcion: "Revisión de quincena", estado: "Pendiente", empleado: employee, fechaSolicitud: "2026-11-15", fechaPermiso: null };
  api.get.mockResolvedValue({ data: { items: [saved], total: 1 } });
  api.put.mockResolvedValue({ data: { ...saved, estado: "Aprobado" } });
  wrapped(<Solicitudes />, "admin");
  await screen.findByText("52418936");
  expect(screen.getByText("N/A — ajuste de nómina")).toBeInTheDocument();
  expect(screen.getByText("15 de noviembre de 2026")).toBeInTheDocument();
  expect(screen.queryByRole("form", { name: "Formato de solicitud del empleado" })).not.toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText("Estado de request-1"), "Aprobado");
  await waitFor(() => expect(api.put).toHaveBeenCalledWith("/solicitudes/request-1", { estado: "Aprobado" }));
  expect(api.get).not.toHaveBeenCalledWith("/solicitudes/formulario");
});
