import { createContext, useCallback, useEffect, useState } from "react";
import api, { setCsrfToken, errorMessage } from "../services/api";
export const AuthContext = createContext();
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const clear = useCallback(() => {
    setUser(null);
    setProfile(null);
    setCsrfToken("");
  }, []);
  const refresh = useCallback(async () => {
    setSessionError("");
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      setProfile(data.profile);
      setCsrfToken(data.csrfToken);
    } catch (error) {
      clear();
      if (error.response?.status !== 401) setSessionError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [clear]);
  useEffect(() => {
    // Retira exclusivamente las credenciales antiguas guardadas por versiones anteriores.
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.addEventListener("sesha:session-expired", clear);
    refresh();
    return () => window.removeEventListener("sesha:session-expired", clear);
  }, [clear, refresh]);
  const establish = async (path, credentials) => {
    const { data } = await api.post(path, credentials);
    if (!data.user || !data.csrfToken)
      throw new Error("Respuesta de sesión inválida");
    setCsrfToken(data.csrfToken);
    setUser(data.user);
    setProfile(null);
    setSessionError("");
    return data;
  };
  const login = (email, password) =>
    establish("/auth/login", { email, password });
  const register = (credentials) => establish("/auth/register", credentials);
  const changePassword = async (credentials) => {
    const { data } = await api.post("/auth/change-password", credentials);
    clear();
    return data;
  };
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      if (error.response?.status !== 401) throw error;
    }
    clear();
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        sessionError,
        login,
        register,
        changePassword,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
