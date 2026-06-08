const API = "http://localhost:8000/api/auth";

// ======================
// REGISTER
// ======================
async function register() {
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch(`${API}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name, email, password })
  });

  const data = await res.json();

  document.getElementById("result").innerText = data.msg || "Registrado";
}

// ======================
// LOGIN
// ======================
async function login() {
  const email = document.getElementById("emailLogin").value;
  const password = document.getElementById("passwordLogin").value;

  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  document.getElementById("result").innerText = data.msg || "Login OK";

  // guardar token si existe
  if (data.token) {
    localStorage.setItem("token", data.token);
  }
}