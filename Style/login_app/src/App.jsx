import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Empleados from "./pages/Empleados";
import Documentos from "./pages/Documentos";
import Solicitudes from "./pages/Solicitudes";
import Perfil from "./pages/Perfil";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import Header from "./components/Header";
const privatePage = (page, admin = false) => (
  <ProtectedRoute admin={admin}>
    <div className="min-h-screen bg-gray-50">
      <Header />
      {page}
    </div>
  </ProtectedRoute>
);
export default function App() {
  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={privatePage(<Dashboard />)} />
        <Route path="/empleados" element={privatePage(<Empleados />, true)} />
        <Route path="/documentos" element={privatePage(<Documentos />)} />
        <Route path="/solicitudes" element={privatePage(<Solicitudes />)} />
        <Route path="/perfil" element={privatePage(<Perfil />)} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
