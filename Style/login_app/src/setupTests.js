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
}));
beforeEach(async () => {
  const { default: api } = await import("./services/api");
  vi.resetAllMocks();
  localStorage.clear();
  api.get.mockImplementation((path) => {
    if (path === "/auth/me")
      return Promise.reject({ response: { status: 401 } });
    if (path === "/auth/positions")
      return Promise.resolve({
        data: [
          { position: "Guarda de seguridad", department: "Operaciones" },
          { position: "Auxiliar de tecnología", department: "Tecnología" },
        ],
      });
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
