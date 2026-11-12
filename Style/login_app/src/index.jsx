import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { reportClientError } from "./utils/clientErrors";
if (import.meta.env.DEV) {
  const report = (event) =>
    reportClientError(event.error || event.reason || event.message);
  window.addEventListener("error", report);
  window.addEventListener("unhandledrejection", report);
  import.meta.hot?.dispose(() => {
    window.removeEventListener("error", report);
    window.removeEventListener("unhandledrejection", report);
  });
}
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
