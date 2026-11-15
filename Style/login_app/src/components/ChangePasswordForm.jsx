import { useRef, useState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { errorMessage } from "../services/api";

export default function ChangePasswordForm({ initialEmail = "", onChangePassword, onSuccess, onCancel }) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef(null);
  const pending = useRef(false);

  const submit = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    setError("");
    const form = formRef.current;
    const currentPassword = form.elements.currentPassword.value;
    const newPassword = form.elements.newPassword.value;
    const confirmPassword = form.elements.confirmPassword.value;
    if ([...newPassword].length < 12 || new TextEncoder().encode(newPassword).length > 72 ||
        [...newPassword].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) {
      setError("La nueva contraseña debe tener al menos 12 caracteres y máximo 72 bytes, sin caracteres de control.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("La confirmación de la nueva contraseña no coincide.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("La nueva contraseña debe ser diferente de la actual.");
      return;
    }
    pending.current = true;
    setLoading(true);
    try {
      await onChangePassword({ email: email.trim(), currentPassword, newPassword, confirmPassword });
      form.reset();
      onSuccess(email.trim());
    } catch (failure) {
      // Retira las claves del formulario después de cualquier respuesta del servidor.
      form.reset();
      setError(errorMessage(failure));
      form.elements.currentPassword.focus();
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  const fieldClass = "w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  return (
    <form ref={formRef} onSubmit={submit} aria-label="Cambiar contraseña" className="space-y-4" aria-busy={loading}>
      <p id="change-password-help" className="text-xs text-gray-600">
        Confirma tu contraseña actual para proteger tu cuenta. Al guardar, se cerrarán tus sesiones anteriores.
      </p>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="space-y-1.5">
        <label htmlFor="change-email" className="block text-xs font-semibold text-gray-700">Correo electrónico</label>
        <input id="change-email" name="email" type="email" autoComplete="username" required autoFocus
          value={email} onChange={(event) => setEmail(event.target.value)} readOnly={loading} className={fieldClass} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="current-password" className="block text-xs font-semibold text-gray-700">Contraseña actual</label>
        <input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required
          minLength={6} readOnly={loading} aria-describedby="change-password-help" className={fieldClass} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="new-password" className="block text-xs font-semibold text-gray-700">Nueva contraseña</label>
        <input id="new-password" name="newPassword" type="password" autoComplete="new-password" required minLength={12}
          readOnly={loading} aria-describedby="new-password-help" className={fieldClass} />
        <p id="new-password-help" className="text-xs text-gray-500">Mínimo 12 caracteres y máximo 72 bytes. Algunos caracteres, como tildes y emojis, ocupan más de un byte.</p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirm-password" className="block text-xs font-semibold text-gray-700">Confirmar nueva contraseña</label>
        <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required minLength={12}
          readOnly={loading} className={fieldClass} />
      </div>
      <button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
        {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <LockKeyhole aria-hidden="true" className="h-4 w-4" />}
        {loading ? "Guardando…" : "Guardar nueva contraseña"}
      </button>
      <button type="button" onClick={onCancel} disabled={loading} className="w-full rounded-lg py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-70">
        Volver a iniciar sesión
      </button>
    </form>
  );
}
