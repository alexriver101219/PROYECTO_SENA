import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  Shield,
  Mail,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import logo from "../assets/Sesha_logo.png";
import ChangePasswordForm from "../components/ChangePasswordForm";

function Login() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [notice, setNotice] = useState("");

  const openPasswordChange = () => {
    setError(null);
    setNotice("");
    setShowPassword(false);
    setFormData((previous) => ({ ...previous, password: "" }));
    setChangingPassword(true);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await auth.login(formData.email, formData.password);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.msg ||
          "Correo o contraseña incorrectos",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 md:p-10 rounded-2xl shadow-lg border border-gray-100 max-w-md w-full space-y-6 relative">
        {/* Enlace para volver al Inicio / Landing */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al Inicio
        </Link>

        {/* Encabezado e Identidad visual */}
        <div className="text-center space-y-2">
          <div className="flex justify-center items-center gap-2">
            <img
              src={logo}
              alt="SESHA APP"
              className="h-10 w-auto object-contain"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{changingPassword ? "Cambiar contraseña" : "Iniciar Sesión"}</h1>
          <p className="text-xs text-gray-600">
            {changingPassword ? "Actualiza el acceso a tu cuenta de SESHA APP." : "Ingresa tus credenciales para acceder a la plataforma SESHA APP."}
          </p>
        </div>

        {/* Mensaje de Error */}
        {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario de Login */}
        {changingPassword ? (
          <ChangePasswordForm initialEmail={formData.email} onChangePassword={auth.changePassword}
            onCancel={() => setChangingPassword(false)}
            onSuccess={(email) => {
              setFormData({ email, password: "" });
              setChangingPassword(false);
              setNotice("Contraseña actualizada. Inicia sesión con tu nueva contraseña.");
            }} />
        ) : <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Correo Electronico */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-xs font-semibold text-gray-700 block"
            >
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                placeholder="tu@correo.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label
                htmlFor="password"
                className="text-xs font-semibold text-gray-700 block"
              >
                Contraseña
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-9 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <button
                type="button"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Botón Submit con Loader */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Accediendo...
              </>
            ) : (
              "Entrar al sistema"
            )}
          </button>
        </form>}

        {!changingPassword && <button type="button" onClick={openPasswordChange} disabled={loading}
          className="w-full rounded-lg border border-blue-200 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-70">
          Cambiar contraseña
        </button>}

        {/* Footer / Enlace a Registro */}
        <div className="pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-600">
            ¿No tienes cuenta corporativa?{" "}
            <Link
              to="/register"
              className="font-semibold text-blue-600 hover:underline"
            >
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default Login;
