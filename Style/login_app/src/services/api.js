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
  const response = await api.get(path, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function uploadPDF(file) {
  if (!file || file.type !== "application/pdf" || file.size > 3 * 1024 * 1024)
    throw new Error("Selecciona un PDF de hasta 3 MB");
  const data = new FormData();
  data.append("file", file);
  return (await api.post("/documentos", data)).data;
}
export default api;
