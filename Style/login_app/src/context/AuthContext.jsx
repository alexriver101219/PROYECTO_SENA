import { createContext, useState } from 'react'

export const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  const login = async (email, password) => {
    // Aquí puedes conectar con tu backend
    if (email === 'test@correo.com' && password === '1234') {
      setUser({ email })
    } else {
      throw new Error('Credenciales inválidas')
    }
  }

  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
