import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Contexto de Autenticación
import { AuthContext, AuthProvider } from './context/AuthContext';

// Importación de Páginas / Módulos
import Dashboard from './pages/Dashboard';
import Solicitudes from './pages/Solicitudes';
import Documentos from './pages/Documentos';
import Perfil from './pages/Perfil';
import Empleados from './pages/Empleados';
import NotFound from './pages/NotFound';
import Login from './pages/Login'; // Asumiendo vista de Inicio de Sesión

/**
 * Guard para proteger rutas privadas.
 * Redirige al Login si el usuario no ha iniciado sesión.
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext) || {};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Ruta Pública */}
      <Route path="/login" element={<Login />} />

      {/* Redirección Inicial */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Rutas Protegidas (Requieren autenticación en SESHA APP / SOFT PRO) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/solicitudes"
        element={
          <ProtectedRoute>
            <Solicitudes />
          </ProtectedRoute>
        }
      />

      <Route
        path="/documentos"
        element={
          <ProtectedRoute>
            <Documentos />
          </ProtectedRoute>
        }
      />

      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <Perfil />
          </ProtectedRoute>
        }
      />

      <Route
        path="/empleados"
        element={
          <ProtectedRoute>
            <Empleados />
          </ProtectedRoute>
        }
      />

      {/* Ruta para capturar cualquier URL inexistente (404) */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}