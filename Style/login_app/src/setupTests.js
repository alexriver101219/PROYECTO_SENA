import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
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
    if (path.startsWith("/documentos/nomina?")) {
      const period = new URLSearchParams(path.split("?")[1]).get("period");
      return Promise.resolve({ data: { period, gross: 2826086, health: 113043, pension: 113043, deductions: 226086,
        healthPercent: 4, pensionPercent: 4, net: 2600000, deductionStatus: "Salud y pensión ya descontadas",
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
