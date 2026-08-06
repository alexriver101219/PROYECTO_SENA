import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Edit3, CheckCircle2, XCircle, X, AlertCircle } from 'lucide-react';

function Empleados() {
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Estados para el Modal y Validaciones
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    document: '',
    position: '',
    department: '',
    status: 'Activo'
  });

  useEffect(() => {
    // Simulación de respuesta del Backend
    setTimeout(() => {
      setEmployees([
        { id: 1, name: 'Alexander Rivera', document: '1012345678', position: 'Desarrollador Junior', department: 'Tecnología', status: 'Activo' },
        { id: 2, name: 'Sandra Milena', document: '1098765432', position: 'Analista de RH', department: 'Talento Humano', status: 'Activo' },
      ]);
      setLoading(false);
    }, 600);
  }, []);

  // Función de Validación en Tiempo Real
  const validateField = (name, value) => {
    let errorMsg = '';

    if (name === 'name') {
      if (!value.trim()) {
        errorMsg = 'El nombre es obligatorio.';
      } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) {
        errorMsg = 'El nombre solo debe contener letras.';
      } else if (value.trim().length < 3) {
        errorMsg = 'Debe tener al menos 3 caracteres.';
      }
    }

    if (name === 'document') {
      if (!value.trim()) {
        errorMsg = 'El documento es obligatorio.';
      } else if (!/^\d+$/.test(value)) {
        errorMsg = 'El documento solo debe contener números.';
      } else if (value.length < 7 || value.length > 10) {
        errorMsg = 'Debe tener entre 7 y 10 dígitos.';
      }
    }

    if (name === 'position' && !value.trim()) {
      errorMsg = 'El cargo es obligatorio.';
    }

    if (name === 'department' && !value.trim()) {
      errorMsg = 'El departamento es obligatorio.';
    }

    setErrors((prevErrors) => ({ ...prevErrors, [name]: errorMsg }));
    return errorMsg;
  };

  const handleOpenCreateModal = () => {
    setEditingEmployee(null);
    setFormData({ name: '', document: '', position: '', department: '', status: 'Activo' });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (employee) => {
    setEditingEmployee(employee);
    setFormData(employee);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    validateField(name, value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validar todos los campos antes de enviar
    const nameErr = validateField('name', formData.name);
    const docErr = validateField('document', formData.document);
    const posErr = validateField('position', formData.position);
    const depErr = validateField('department', formData.department);

    // Si existe algún error, no continúa
    if (nameErr || docErr || posErr || depErr) {
      return;
    }

    if (editingEmployee) {
      setEmployees(employees.map(emp => emp.id === editingEmployee.id ? { ...formData, id: emp.id } : emp));
    } else {
      setEmployees([...employees, { ...formData, id: Date.now() }]);
    }
    setIsModalOpen(false);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.document.includes(searchQuery) ||
    emp.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Gestión de Empleados
          </h1>
          <p className="text-sm text-gray-600">Administra el directorio de personal activo e inactivo.</p>
        </div>

        <button 
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow transition flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Nuevo Empleado
        </button>
      </header>

      {/* Buscador */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center gap-2">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, documento o cargo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-sm outline-none bg-transparent text-gray-700"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 font-medium">Cargando directorio...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-600 text-xs uppercase tracking-wider">
                  <th className="p-4">Nombre Completo</th>
                  <th className="p-4">Documento</th>
                  <th className="p-4">Cargo</th>
                  <th className="p-4">Departamento</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm text-gray-700">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-semibold text-gray-800">{emp.name}</td>
                    <td className="p-4">{emp.document}</td>
                    <td className="p-4">{emp.position}</td>
                    <td className="p-4">{emp.department}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        emp.status === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {emp.status === 'Activo' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {emp.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => handleOpenEditModal(emp)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded transition" title="Editar">
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Formulario con Validaciones */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 relative">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-gray-800">
              {editingEmployee ? 'Editar Empleado' : 'Registrar Empleado'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campo Nombre */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Nombre Completo</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full p-2 border rounded-md text-sm outline-none ${
                    errors.name ? 'border-red-500 bg-red-50' : 'focus:border-blue-500'
                  }`}
                />
                {errors.name && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.name}
                  </p>
                )}
              </div>

              {/* Campo Documento */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Documento de Identidad (Solo números)</label>
                <input
                  type="text"
                  name="document"
                  value={formData.document}
                  onChange={handleInputChange}
                  placeholder="Ej: 1012345678"
                  className={`w-full p-2 border rounded-md text-sm outline-none ${
                    errors.document ? 'border-red-500 bg-red-50' : 'focus:border-blue-500'
                  }`}
                />
                {errors.document && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.document}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Campo Cargo */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Cargo</label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    className={`w-full p-2 border rounded-md text-sm outline-none ${
                      errors.position ? 'border-red-500 bg-red-50' : 'focus:border-blue-500'
                    }`}
                  />
                  {errors.position && (
                    <p className="text-xs text-red-600 mt-1">{errors.position}</p>
                  )}
                </div>

                {/* Campo Departamento */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Departamento</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className={`w-full p-2 border rounded-md text-sm outline-none ${
                      errors.department ? 'border-red-500 bg-red-50' : 'focus:border-blue-500'
                    }`}
                  />
                  {errors.department && (
                    <p className="text-xs text-red-600 mt-1">{errors.department}</p>
                  )}
                </div>
              </div>

              {/* Campo Estado */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Estado</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm outline-none focus:border-blue-500 bg-white"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>

              {/* Botones de Acción */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium shadow transition"
                >
                  {editingEmployee ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Empleados;