import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  User, 
  Mail, 
  Lock, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Loader2, 
  ArrowLeft, 
  UserPlus 
} from 'lucide-react';
import api from '../services/api';
import logo from '../assets/Sesha_logo.png';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validaciones locales
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      if (response.data?.token) {
        localStorage.setItem('token', response.data.token);
      }

      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.msg ||
        err.response?.data?.message ||
        'Error al crear la cuenta. Intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-8">
      <div className="bg-white p-8 md:p-10 rounded-2xl shadow-lg border border-gray-100 max-w-md w-full space-y-6 relative">
        
        {/* Enlace para volver */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al Inicio
        </Link>

        {/* Header e Identidad */}
        <div className="text-center space-y-2">
          <div className="flex justify-center items-center gap-2">
            <img 
              src={logo} 
              alt="SESHA APP" 
              className="h-10 w-auto object-contain"
              onError={(e) => { e.target.style.display = 'none'; }} 
            />
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Crear cuenta corporativa</h1>
          <p className="text-xs text-gray-600">
            Completa tus datos para registrarte en la plataforma SESHA APP.
          </p>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Nombre Completo */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-xs font-semibold text-gray-700 block">
              Nombre completo
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="name"
                type="text"
                required
                placeholder="Ej. Alexander Rivera"
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Correo Electrónico */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-gray-700 block">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="email"
                type="email"
                required
                placeholder="tu@correo.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-gray-700 block">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-9 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar Contraseña */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-xs font-semibold text-gray-700 block">
              Confirmar contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                placeholder="Repite tu contraseña"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full pl-9 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botón de Envio */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed pt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Registrando...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Registrarse
              </>
            )}
          </button>

        </form>

        {/* Footer / Login */}
        <div className="pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-600">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:underline">
              Inicia sesión aquí
            </Link>
          </p>
        </div>

      </div>
    </main>
  );
}

export default Register;