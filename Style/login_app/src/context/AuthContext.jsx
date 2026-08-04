import { createContext, useEffect, useState } from "react";
import api from "../services/api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (token) {
        setUser(savedUser ? JSON.parse(savedUser) : { token });
      }
    } catch (error) {
      console.error("No se pudo cargar la sesión guardada", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    if (response.data?.token) {
      localStorage.setItem("token", response.data.token);
    }

    const loggedUser = response.data?.user || { email };
    localStorage.setItem("user", JSON.stringify(loggedUser));
    setUser(loggedUser);

    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
