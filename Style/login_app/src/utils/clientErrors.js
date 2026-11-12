export function reportClientError(error) {
  if (!import.meta.env.DEV) return;
  fetch("/__sesha-client-error", {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: String(error?.message || error || "Error de interfaz").slice(
        0,
        1000,
      ),
      stack: String(error?.stack || "").slice(0, 2000),
    }),
  }).catch(() => {});
}
