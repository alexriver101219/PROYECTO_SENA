import axios from "axios";
const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 20000,
});
let csrf = "";
export function setCsrfToken(value) {
  csrf = value || "";
}
export const errorMessage = (error) =>
  error.response?.data?.message || "No se pudo conectar. Intenta de nuevo.";
api.interceptors.request.use((config) => {
  if (csrf && !["get", "head", "options"].includes(config.method))
    config.headers["X-CSRF-Token"] = csrf;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !["/auth/login", "/auth/register"].includes(error.config?.url)
    ) {
      setCsrfToken("");
      window.dispatchEvent(new Event("sesha:session-expired"));
    }
    return Promise.reject(error);
  },
);
export async function download(path, filename) {
  let response;
  try {
    response = await api.get(path, { responseType: "blob" });
  } catch (error) {
    if (error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text());
      } catch {
        /* Conserva el error HTTP original. */
      }
    }
    throw error;
  }
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  const suggested =
    response.headers["content-disposition"]?.match(/filename="?([^";]+)/)?.[1];
  link.download = filename || suggested || "documento.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadEmploymentCertificate() {
  return download("/documentos/certificado");
}
export async function uploadPDF(file) {
  if (!file || file.type !== "application/pdf" || file.size > 3 * 1024 * 1024)
    throw new Error("Selecciona un PDF de hasta 3 MB");
  const data = new FormData();
  data.append("file", file);
  return (await api.post("/documentos", data)).data;
}
export default api;
