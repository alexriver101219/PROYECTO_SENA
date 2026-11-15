import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { todayInBogota } from "./utils/formatters";
vi.mock("./services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  setCsrfToken: vi.fn(),
  errorMessage: (error) =>
    error.response?.data?.message || "No se pudo conectar",
  uploadPDF: vi.fn(),
  download: vi.fn(),
  downloadEmploymentCertificate: vi.fn(),
  downloadPayslip: vi.fn(),
}));
beforeEach(async () => {
  const { default: api } = await import("./services/api");
  vi.resetAllMocks();
  localStorage.clear();
  api.get.mockImplementation((path) => {
    if (path === "/solicitudes/formulario") return Promise.resolve({ data: {
      employee: { name: "Ana Torres", document: "52418936", email: "ana@sesha.com", position: "Guarda de seguridad", department: "Operaciones" },
      requestDate: todayInBogota(), types: ["Día de la familia", "Permiso remunerado", "Permiso no remunerado", "Ajuste de nómina"],
    } });
    if (path.startsWith("/documentos/nomina?")) {
      const period = new URLSearchParams(path.split("?")[1]).get("period");
      const half = new URLSearchParams(path.split("?")[1]).get("half") || "1";
      const [year, month] = period.split("-").map(Number);
      const end = new Date(Date.UTC(year, month, 0)).getUTCDate();
      return Promise.resolve({ data: { period, half, periodStart: `${period}-${half === "1" ? "01" : "16"}`, periodEnd: `${period}-${half === "1" ? "15" : end}`,
        monthlyNet: 2600000, gross: 1354166, health: 27083, pension: 27083, deductions: 54166,
        healthPercent: 2, pensionPercent: 2, net: 1300000, deductionStatus: "Salud y pensión descontadas en esta quincena",
        payment: { method: "Transferencia bancaria", bank: "Bancolombia" },
        schedule: { code: "2x2x2", label: "2 días, 2 noches y 2 descansos" },
        scopeNote: "Devengado calculado para conservar el neto mensual acordado." } });
    }
    if (path === "/auth/me")
      return Promise.reject({ response: { status: 401 } });
    if (path === "/auth/positions")
      return Promise.resolve({
        data: [
          { position: "Guarda de seguridad", department: "Operaciones" },
          { position: "Auxiliar de tecnología", department: "Tecnología" },
        ],
      });
    if (path === "/auth/registration") return Promise.resolve({ data: { enabled: true } });
    return Promise.resolve({
      data: {
        items: [],
        total: 0,
        documentos: 0,
        solicitudes: 0,
        pendientes: 0,
      },
    });
  });
});
afterEach(cleanup);
