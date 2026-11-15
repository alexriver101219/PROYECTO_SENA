import { useState } from "react";
import api, { errorMessage } from "../services/api";
import { useCollection } from "../hooks/useCollection";
import Pagination from "../components/Pagination";
import { formatEmploymentDate, todayInBogota } from "../utils/formatters";
const empty = {
  name: "",
  document: "",
  position: "",
  department: "",
  status: "Activo",
  email: "",
  hireDate: "",
};
export default function Empleados() {
  const collection = useCollection("/empleados");
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [createAccount, setCreateAccount] = useState(false);
  const [initialPassword, setInitialPassword] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (editing) await api.put("/empleados/" + editing, form);
      else await api.post("/empleados", createAccount ? { ...form, initialPassword } : form);
      setOpen(false);
      setForm(empty);
      setEditing(null);
      collection.refresh();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setInitialPassword("");
      setBusy(false);
    }
  };
  const edit = (employee) => {
    setForm({
      name: employee.name,
      document: employee.document,
      position: employee.position,
      department: employee.department,
      status: employee.status,
      email: employee.user?.email || "",
      hireDate: employee.hireDate || "",
    });
    setEditing(employee.id);
    setError("");
    setOpen(true);
  };
  const filtered = collection.items.filter((employee) =>
    (employee.name + employee.document + employee.position)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Gestión de Empleados
          </h1>
          <p>Directorio de perfiles laborales.</p>
        </div>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => {
            setForm(empty);
            setEditing(null);
            setCreateAccount(false);
            setInitialPassword("");
            setError("");
            setOpen(true);
          }}
        >
          Nuevo empleado
        </button>
      </div>
      <label className="block">
        Buscar en esta página
        <input
          className="block w-full p-2 mt-1"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nombre, documento o cargo"
        />
      </label>
      {collection.error && (
        <div role="alert">
          {collection.error}{" "}
          <button onClick={collection.refresh}>Reintentar</button>
        </div>
      )}
      {collection.loading ? (
        <p role="status">Cargando directorio…</p>
      ) : (
        <div className="overflow-x-auto bg-white border rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100">
              <tr>
                {[
                  "Nombre",
                  "Documento",
                  "Cargo",
                  "Departamento",
                  "Estado",
                  "Fecha de ingreso",
                  "Acciones",
                ].map((title) => (
                  <th className="p-3" key={title}>
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((employee) => (
                <tr key={employee.id} className="border-t">
                  <td className="p-3">{employee.name}</td>
                  <td className="p-3">{employee.document}</td>
                  <td className="p-3">{employee.position}</td>
                  <td className="p-3">{employee.department}</td>
                  <td className="p-3">{employee.status}</td>
                  <td className="p-3">
                    {formatEmploymentDate(employee.hireDate)}
                  </td>
                  <td className="p-3">
                    <button
                      className="text-blue-700"
                      onClick={() => edit(employee)}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan="7" className="p-6">
                    No hay empleados para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <Pagination collection={collection} />
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-title"
            className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-auto space-y-4"
          >
            <h2 id="employee-title" className="font-bold text-xl">
              {editing ? "Editar empleado" : "Registrar empleado"}
            </h2>
            {error && (
              <p role="alert" className="text-red-700">
                {error}
              </p>
            )}
            <form onSubmit={submit} className="space-y-3">
              {[
                ["name", "Nombre completo"],
                ["document", "Documento"],
                ["position", "Cargo"],
                ["department", "Departamento"],
                ["email", "Correo de la cuenta (opcional)"],
              ].map(([name, label]) => (
                <label key={name} className="block text-sm">
                  {label}
                  <input
                    name={name}
                    type={name === "email" ? "email" : "text"}
                    className="block w-full p-2 mt-1"
                    required={name !== "email"}
                    minLength={
                      name === "document"
                        ? 7
                        : name === "name"
                          ? 3
                          : name === "email"
                            ? undefined
                            : 2
                    }
                    maxLength={
                      name === "document" ? 10 : name === "email" ? 254 : 100
                    }
                    pattern={name === "document" ? "[0-9]{7,10}" : undefined}
                    value={form[name]}
                    onChange={(event) =>
                      setForm({ ...form, [name]: event.target.value })
                    }
                  />
                </label>
              ))}
              <p className="text-xs text-slate-500">
                Usa los datos verificados del empleado. Para vincular una cuenta existente, indica su correo.
                Puedes registrar personal sin cuenta dejando el correo vacío.
              </p>
              {!editing && <>
                <label className="block text-sm">
                  <input type="checkbox" checked={createAccount} onChange={(event) => {
                    setCreateAccount(event.target.checked); setInitialPassword("");
                  }} /> Crear también su cuenta de acceso
                </label>
                {createAccount && <label className="block text-sm">
                  Contraseña inicial (comunícala por un canal privado)
                  <input type="password" autoComplete="new-password" required minLength={12}
                    className="block w-full p-2 mt-1" value={initialPassword}
                    onChange={(event) => setInitialPassword(event.target.value)} />
                  <span className="text-xs">Mínimo 12 caracteres y máximo 72 bytes. El empleado puede cambiarla al iniciar sesión.</span>
                </label>}
              </>}
              <label className="block text-sm">
                Fecha de ingreso
                <input
                  type="date"
                  name="hireDate"
                  required
                  min="1950-01-01"
                  max={todayInBogota()}
                  className="block w-full p-2 mt-1"
                  value={form.hireDate}
                  onChange={(event) =>
                    setForm({ ...form, hireDate: event.target.value })
                  }
                />
              </label>
              <label className="block text-sm">
                Estado
                <select
                  className="block w-full p-2 mt-1"
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value })
                  }
                >
                  <option>Activo</option>
                  <option>Inactivo</option>
                </select>
              </label>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { setInitialPassword(""); setOpen(false); }}
                >
                  Cancelar
                </button>
                <button
                  disabled={busy}
                  className="bg-blue-600 text-white rounded px-4 py-2"
                >
                  {busy ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
