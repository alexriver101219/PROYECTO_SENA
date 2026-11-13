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

Vite escucha en `localhost` para utilizar la misma resolución IPv4 o IPv6 del equipo. En Windows, `localhost` puede resolver únicamente a `::1`; limitar Vite a `127.0.0.1` deja esa URL sin conexión. El puerto es estricto: si el 5173 está ocupado, el inicio informa el error en lugar de cambiar silenciosamente de dirección. Si la página no carga, comprobar `http://localhost:5173/` y `http://localhost:5173/api/ready`, y mantener abiertas ambas terminales. Usar Node.js 24 como indica `.nvmrc`; Node.js 23.3.0 provoca errores al iniciar las pruebas del frontend con las dependencias actuales.

## Publicar en tu proyecto de Vercel

1. Importar o conectar el repositorio existente. Usar como Root Directory la raíz del repositorio, no backend ni Style/login_app.
2. Seleccionar framework Other y Node.js 24.x. vercel.json configura npm ci, npm run build y Style/login_app/dist.
3. En Settings → Environment Variables configurar MONGO_URI, JWT_SECRET, APP_ORIGIN y NODE_ENV=production para los entornos utilizados. .env.vercel.example muestra sus nombres sin credenciales reales. La URI debe apuntar a tu base académica de Atlas. Codificar caracteres especiales de usuario/contraseña en la URI.
4. Configurar un usuario de Atlas con permisos solo sobre esa base y acceso de red desde las funciones de Vercel, usando las opciones de red disponibles en tu plan. No deshabilitar TLS.
5. Ejecutar migrate y seed desde un entorno autorizado con esas mismas variables antes de exponer el sitio. No ejecutar ambos comandos en cada build o petición. No copiar el archivo .env local al directorio de salida.
6. Publicar la rama corregida y comprobar: /api/health devuelve alive; /api/ready devuelve ready; el ingreso académico funciona; crear una solicitud y cargar un PDF sobreviven a recargar; un empleado no puede abrir /empleados ni ver documentos ajenos.
7. Para una Preview Deployment, usar preferentemente otra base de Atlas y otro JWT_SECRET. La API acepta los dominios exactos que Vercel proporciona en VERCEL_URL y VERCEL_PROJECT_PRODUCTION_URL, además de APP_ORIGIN.

Solo el frontend compilado se publica como contenido estático. Las rutas /api llegan a api/index.js; las rutas de React admiten recarga directa. La conexión a MongoDB se reutiliza entre invocaciones. No hay estado de cuentas en mapas de memoria ni archivos persistidos en el disco de la función.

### Acceso estable de Atlas para la demostración

Para este proyecto académico se eligió mantener una entrada permanente `0.0.0.0/0`, sin contratar IP estática en Vercel. Esa entrada permite conexiones desde cualquier IP y mantiene la autenticación de MongoDB; usar únicamente datos ficticios. En Atlas, dentro del proyecto PROYECTO SENA, abrir **Database & Network Access → IP Access List**, editar la entrada `0.0.0.0/0`, convertirla de temporal a permanente y confirmar. Comprobar que quede **Active**, sin fecha de vencimiento. No hace falta volver a desplegar la aplicación por este cambio de red.

Si la entrada ya existe, utilizar **EDIT** en su fila. El diálogo **Add IP Access List Entry** crea otra entrada y no modifica la existente. Si Atlas rechaza guardar, revisar el mensaje concreto de error y si hay un cambio de firewall todavía en curso antes de volver a enviar la operación. Tener abiertas sesiones en Firefox y Edge no demuestra que exista un conflicto de guardado.

La aplicación utiliza `sesha_app_srv`, autenticado por contraseña (SCRAM), con únicamente el rol `readWrite` sobre `proyecto_sena`. Se verificaron los permisos efectivos mediante `connectionStatus`. `MONGO_URI` está actualizado en `backend/.env` y como secreto de producción en Vercel; el despliegue público ya utiliza la nueva conexión. El acceso administrador se conserva separado para mantenimiento. La contraseña se transfirió mediante un archivo temporal ignorado por Git y Vercel, que se eliminó tras verificar el cambio; no compartirla en el chat ni guardarla en archivos rastreados.

Después de aplicar el cambio, verificar `https://sesha-app.vercel.app/api/ready` y el ingreso académico. Una respuesta `ready` confirma disponibilidad actual; la ausencia de vencimiento debe comprobarse en Atlas. Referencia: https://www.mongodb.com/docs/atlas/security/ip-access-list/.

Los PDF se limitan a 3 MB tanto en cliente como en servidor, por debajo del límite de 4.5 MB de peticiones/respuestas de Vercel Functions. Se almacenan en MongoDB y se descargan como adjuntos, con acceso restringido. Para archivos mayores o un uso intensivo se requiere almacenamiento de objetos y un flujo de carga directa.

## Permisos y comportamiento

### Cargos de registro y distribución del personal

El desplegable Cargo consulta `/api/auth/positions`; su catálogo único está en `backend/config/laborPositions.js`. El registro valida esa selección y asigna el área correspondiente al perfil. Todos los cargos laborales conservan el rol de acceso `employee`.

El 13/11/2026 se reasignaron 44 de los 127 guardas existentes, conservando los 152 perfiles y los demás cargos:

| Cargo | Personas |
| --- | ---: |
| Guarda de seguridad | 83 |
| Escolta de mercancías | 6 |
| Escolta VIP | 6 |
| Operador de medios tecnológicos | 4 |
| Coordinador de escoltas | 2 |
| Técnico de medios tecnológicos | 2 |
| Supervisor de medios tecnológicos | 2 |
| Guarda canino | 20 |
| Auxiliar de almacén | 2 |

Los tres cargos de medios tecnológicos pertenecen a Tecnología; Auxiliar de almacén, a Administración; los demás cargos nuevos, a Operaciones. El catálogo contiene además los cargos anteriores. Estas cantidades describen la redistribución puntual, no cupos máximos de registro.

La migración `backend/scripts/redistribute-security-guards.js` requiere primero generar un plan privado con `--plan .qa/<archivo>.json`; `--apply` aplica ese mismo plan en una transacción. Comprueba los 127 guardas, los 44 destinos, la huella de los perfiles antes y después, y no aplica el mismo plan dos veces. Solo actualiza cargo y área. El plan incluye los valores anteriores de esos campos y permanece ignorado por Git/Vercel. No se ejecuta automáticamente al arrancar o desplegar.

### Acceso y operaciones

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

## Informes de pruebas y GitHub Pages

Los tres PDF revisados se conservan en `docs/pruebas/2026-11-13/`, junto al resumen sanitizado `resultados.json`. Es adecuado mantenerlos en el proyecto: se pueden abrir desde VS Code y versionar como evidencias. Los registros privados, sesiones y tokens permanecen fuera de Git en `.qa/`.

Portal de informes: https://alexriver101219.github.io/PROYECTO_SENA/. Su fuente es la carpeta `/docs` de la rama `main`; no requiere modificar el despliegue de SESHA en Vercel.

Resultado del 13/11/2026: 77 verificaciones funcionales aprobadas. k6 confirmó 50 solicitudes/s durante 60 s en el equipo local; 125/s pasó solo 25 s y no mantuvo la confirmación de 60 s. ZAP registró 0 clases altas, 1 media, 1 baja y 4 informativas, con revisión de contexto. La alerta baja se limitó al servidor estático de laboratorio. No se probó capacidad de Vercel/Atlas ni un número máximo de usuarios reales.

Procedimiento reproducible y alcance: [qa/README.md](qa/README.md). Generador de informes: `qa/generate_reports.py`. Los PDF y herramientas QA se excluyen del paquete de despliegue de Vercel.

Se añadió un cuarto informe, `informe-seguridad-zap-vercel.pdf`, del análisis autorizado sobre `https://sesha-app.vercel.app`: 14 rutas/recursos revisados pasivamente y 22 peticiones activas de XSS/NoSQL en los parámetros GET de paginación de empleados. ZAP terminó con código 0: 0 clases altas, 2 medias, 0 bajas y 4 informativas. Las medias corresponden a CSP inline y CORS en recursos públicos. La API bloqueó un origen ajeno y las dos cuentas de contraste recibieron sus propios perfiles con `no-store`; no se confirmó una fuga. Los conteos permanecieron iguales y la disponibilidad final fue HTTP 200. Es un alcance acotado, distinto al ensayo local, sin carga ni operaciones de escritura durante el escaneo.

## Documentación de despliegue

- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- https://vercel.com/docs/functions/limitations
