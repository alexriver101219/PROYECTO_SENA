import React from 'react'
import './App.css'

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Bienvenido a Mi App 🚀</h1>
        <p>
          Esta es tu aplicación React inicial.  
          Empieza editando <code>src/App.js</code> y guarda para ver los cambios.
        </p>
        <nav>
          <a href="/landing" className="App-link">Landing</a>
          <a href="/register" className="App-link">Registro</a>
          <a href="/profile" className="App-link">Perfil</a>
        </nav>
      </header>
      <main>
        <section>
          <h2>Tu proyecto está listo</h2>
          <p>
            Ahora puedes comenzar a integrar tus componentes (Login, Registro, Landing, Perfil) 
            y conectar el frontend con tu backend en Express/MongoDB.
          </p>
        </section>
      </main>
      <footer>
        <p>&copy; 2026 Mi App | Todos los derechos reservados</p>
      </footer>
    </div>
  )
}

export default App

