import { Component } from "react";
import { reportClientError } from "../utils/clientErrors";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    reportClientError(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main role="alert" className="min-h-screen bg-gray-50 text-slate-800 p-8">
        <div className="max-w-lg mx-auto bg-white border rounded-xl p-6 space-y-4">
          <h1 className="text-xl font-bold">
            No se pudo mostrar esta pantalla
          </h1>
          <p>Tu sesión no se ha borrado. Recarga para intentar nuevamente.</p>
          {import.meta.env.DEV && (
            <pre className="whitespace-pre-wrap break-words text-sm">
              {this.state.error.message}
            </pre>
          )}
          <button
            className="bg-blue-600 text-white rounded px-4 py-2"
            onClick={() => window.location.reload()}
          >
            Recargar
          </button>
          <a href="/login" className="block text-blue-700">
            Volver al ingreso
          </a>
        </div>
      </main>
    );
  }
}
