# SESHA APP — Proyecto SENA

Aplicación académica para gestionar perfiles laborales, solicitudes y documentos. React + Vite en el navegador, Express en una función de Vercel y MongoDB Atlas para cuentas, registros y archivos.

## Requisitos y estructura

- Node.js 24 LTS y npm 11. Las versiones de dependencias quedan fijadas en un único package-lock.json.
- MongoDB Atlas o un MongoDB local configurado como replica set. El registro de cuenta y perfil usa una transacción para evitar datos incompletos.
- Instalación desde la raíz: npm ci. En PowerShell, si npm.ps1 está bloqueado, usar npm.cmd.

  backend/
  app.js Aplicación Express, sin abrir puertos al importar
  server.js Arranque local
  config/ Validación de entorno y conexión reutilizable
  routes/ API por módulo
  services/ Autenticación, sesión y limitación compartida
  middlewares/ Autorización y carga de PDF
  models/ Cuentas, perfiles, documentos y solicitudes
  scripts/ Migración y cuentas académicas explícitas
  test/ Integración con MongoDB temporal
  Style/login_app/src/ React, contexto de sesión y cliente HTTP
  api/index.js Entrada serverless
  vercel.json Compilación, rutas y cabeceras
  .github/workflows/ci.yml Verificación automática

## Configuración local

Copiar backend/.env.example a backend/.env y configurar:

| Variable   | Uso                                                                     |
| ---------- | ----------------------------------------------------------------------- |
| MONGO_URI  | URI de la base local o Atlas, con nombre de base explícito              |
| JWT_SECRET | Secreto aleatorio privado de al menos 32 bytes                          |
| APP_ORIGIN | http://localhost:5173 en desarrollo; URL exacta del sitio en producción |
| PORT       | 8000 para la API local                                                  |
| NODE_ENV   | development local, production en Vercel                                 |

Para generar un secreto: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

JWT_SECRET es la clave interna de firma; es independiente de la contraseña del usuario. No incluir archivos .env ni secretos en commits, capturas o conversaciones.

Antes de utilizar una base existente, conservar una copia de seguridad. Ejecutar, una sola vez y desde la raíz:

    npm run migrate
    npm run seed

La migración conserva las cuentas históricas en empleados y separa los perfiles laborales en perfiles_empleados. Copia únicamente los perfiles heredados que tengan datos completos y válidos. Los documentos y solicitudes antiguos sin propietario no se asignan automáticamente a una persona; el administrador debe revisar esos registros. Crea índices únicos y el índice TTL de los contadores. Retira únicamente el índice heredado username_1 cuando coincide exactamente con ese campo obsoleto; no elimina documentos.

La semilla es explícita y repetible. No se ejecuta al iniciar la API ni en cada login y no sobrescribe contraseñas existentes. Prepara estas cuentas académicas:

| Cuenta                   | Contraseña | Permisos      |
| ------------------------ | ---------- | ------------- |
| admin@sesha.com          | 123456     | Administrador |
| carlos.mendoza@sesha.com | Sesha2026! | Empleado      |
| laura.gomez@sesha.com    | Sesha2026! | Empleado      |

Se conserva la contraseña académica por petición del autor. Estas credenciales compartidas permiten a cualquier visitante que las conozca usar sus permisos: cargar únicamente datos ficticios en la exposición. Preparar la semilla antes de habilitar el acceso público. Si ya existe admin@sesha.com con otro rol, el script se detiene para evitar elevar una cuenta inesperada; revisar esa cuenta directamente antes de continuar.

Abrir dos terminales desde la raíz:

    npm run dev:api
    npm run dev

Visitar http://localhost:5173. El proxy de Vite envía /api al puerto 8000. En producción el navegador usa /api del mismo dominio; no se requiere una URL de localhost ni variables VITE_API_URL o REACT_APP_API_URL.

## Publicar en tu proyecto de Vercel

1. Importar o conectar el repositorio existente. Usar como Root Directory la raíz del repositorio, no backend ni Style/login_app.
2. Seleccionar framework Other y Node.js 24.x. vercel.json configura npm ci, npm run build y Style/login_app/dist.
3. En Settings → Environment Variables configurar MONGO_URI, JWT_SECRET, APP_ORIGIN y NODE_ENV=production para los entornos utilizados. .env.vercel.example muestra sus nombres sin credenciales reales. La URI debe apuntar a tu base académica de Atlas. Codificar caracteres especiales de usuario/contraseña en la URI.
4. Configurar un usuario de Atlas con permisos solo sobre esa base y acceso de red desde las funciones de Vercel, usando las opciones de red disponibles en tu plan. No deshabilitar TLS.
5. Ejecutar migrate y seed desde un entorno autorizado con esas mismas variables antes de exponer el sitio. No ejecutar ambos comandos en cada build o petición. No copiar el archivo .env local al directorio de salida.
6. Publicar la rama corregida y comprobar: /api/health devuelve alive; /api/ready devuelve ready; el ingreso académico funciona; crear una solicitud y cargar un PDF sobreviven a recargar; un empleado no puede abrir /empleados ni ver documentos ajenos.
7. Para una Preview Deployment, usar preferentemente otra base de Atlas y otro JWT_SECRET. La API acepta los dominios exactos que Vercel proporciona en VERCEL_URL y VERCEL_PROJECT_PRODUCTION_URL, además de APP_ORIGIN.

Solo el frontend compilado se publica como contenido estático. Las rutas /api llegan a api/index.js; las rutas de React admiten recarga directa. La conexión a MongoDB se reutiliza entre invocaciones. No hay estado de cuentas en mapas de memoria ni archivos persistidos en el disco de la función.

Los PDF se limitan a 3 MB tanto en cliente como en servidor, por debajo del límite de 4.5 MB de peticiones/respuestas de Vercel Functions. Se almacenan en MongoDB y se descargan como adjuntos, con acceso restringido. Para archivos mayores o un uso intensivo se requiere almacenamiento de objetos y un flujo de carga directa.

## Permisos y comportamiento

- El registro crea cuentas employee con un perfil laboral ficticio y fecha de ingreso persistida; enviar role, owner u otros campos no permitidos se rechaza.
- Administrador: gestiona perfiles y revisa solicitudes; puede consultar documentos para la demostración.
- Empleado: consulta su perfil y gestiona sus propios PDF y solicitudes; puede cancelar solo solicitudes pendientes.
- Las cuentas nuevas reciben automáticamente un perfil de demostración. Para corregir sus datos laborales, editar el perfil existente desde Empleados; también se puede registrar personal sin cuenta con el correo opcional vacío.
- Los adjuntos usados en solicitudes no se borran mientras estén referenciados.
- La sesión JWT dura dos horas, se guarda en cookie HttpOnly/Secure/SameSite=Strict en producción y usa protección CSRF para operaciones autenticadas. Logout revoca las sesiones anteriores de esa cuenta.
- El servidor verifica firma, audiencia, emisor, estado de cuenta y permisos en cada petición. Los roles no se aceptan del almacenamiento del navegador.
- Sin MongoDB no se informa éxito: /api/ready y operaciones de datos responden 503.
- El alta pública con dominio @sesha.com es una convención de la demostración; no verifica titularidad de un buzón real. No se presenta como directorio corporativo con identidad verificada.
- La constancia laboral PDF usa el nombre del usuario autenticado y su documento, cargo, área y fecha de ingreso guardados. La fecha de expedición se calcula al descargar en la zona America/Bogota. Documentos y Mi perfil comparten el mismo generador; el pie identifica los datos ficticios de demostración.
- La fecha de ingreso puede editarse desde Empleados. Se rechazan fechas imposibles o futuras. Para completar perfiles históricos y fechas faltantes, ejecutar primero `node backend/scripts/complete-labor-profiles.js` y luego agregar `--apply` para guardar. Las contraseñas y los datos laborales válidos se conservan.
- Los listados se paginan y los contadores de intentos se comparten en MongoDB entre instancias de Vercel.

## Pruebas y mantenimiento

    npm run lint
    npm test
    npm run build
    npm audit

Vitest cubre servidor y navegador. Las pruebas del servidor arrancan una base MongoDB temporal; nunca leen backend/.env ni se conectan a Atlas. La primera ejecución descarga el binario oficial de MongoDB y necesita Internet. No se requiere mantener una instancia MongoDB de pruebas. El binario descargado, cachés y respaldos locales de dependencias quedan ignorados por Git y Vercel.

CI ejecuta instalación reproducible, lint, pruebas, build y auditoría de dependencias en Linux. Hay una excepción de versión para minimatch en package.json para evitar la versión vulnerable utilizada por ESLint. Mantenerla hasta que la cadena de dependencias use una versión corregida de manera nativa.

Consultar CAMBIOS_Y_VALIDACION.md para los resultados de esta corrección. AUDITORIA_TECNICA.md conserva el diagnóstico previo y no describe el estado posterior.

## Referencias de despliegue

- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- https://vercel.com/docs/functions/limitations
