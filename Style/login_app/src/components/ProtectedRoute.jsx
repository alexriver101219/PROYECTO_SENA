import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
export default function ProtectedRoute({ children, admin = false }) {
  const auth = useAuth();
  const location = useLocation();
  if (auth.loading)
    return (
      <p role="status" className="p-8">
        Comprobando sesión?
      </p>
    );
  if (auth.sessionError)
    return (
      <div className="p-8">
        <p role="alert">{auth.sessionError}</p>
        <button onClick={auth.refresh}>Reintentar</button>
      </div>
    );
  if (!auth.user)
    return <Navigate to="/login" replace state={{ from: location }} />;
  if (admin && auth.user.role !== "admin")
    return <Navigate to="/dashboard" replace />;
  return children;
}
