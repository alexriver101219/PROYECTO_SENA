# SESHA APP — Proyecto SENA

Aplicación académica para gestionar perfiles laborales, solicitudes y documentos. React + Vite en el navegador, Express en una función de Vercel y MongoDB Atlas para cuentas, registros y archivos.

El sitio publicado se opera como producción: el registro público está cerrado. El administrador crea cuentas y perfiles verificados desde **Empleados → Nuevo empleado → Crear también su cuenta de acceso**, con contraseña inicial oculta. Véase [arquitectura y operación](ARQUITECTURA_Y_PRODUCCION.md) y [manejo de credenciales](SECURITY.md). Con autorizaciones específicas se desactivaron las 120 demos y otras 19 cuentas afectadas, conservando cuentas y perfiles; los secretos JWT local y de producción se sustituyeron sin mostrarlos.

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

La semilla es explícita y repetible. No se ejecuta al iniciar la API ni en cada login y no sobrescribe contraseñas existentes.

Las nuevas cuentas requieren `SEED_ADMIN_PASSWORD`, `SEED_CARLOS_PASSWORD` y `SEED_LAURA_PASSWORD` en el entorno privado. No hay claves predeterminadas. La semilla conserva claves y roles de cuentas existentes; no debe usarse para rotar accesos. `add-demo-employees.js --apply` requiere `DEMO_EMPLOYEES_PASSWORD`; sin `--apply` solo consulta el plan. No ejecutar estos scripts sobre producción sin autorización específica.

Para inspeccionar el destino sin escrituras: `npm run passwords:inspect`. El cambio privado de claves y su autorización se describen en [SECURITY.md](SECURITY.md).

En la pantalla de inicio de sesión, el botón **Cambiar contraseña** permite actualizar el acceso con correo, contraseña actual, nueva contraseña y confirmación. La nueva clave requiere al menos 12 caracteres y como máximo 72 bytes UTF-8. Al guardar se revocan las sesiones anteriores y se vuelve al login. Esta opción requiere conocer la clave actual; no recupera contraseñas olvidadas.

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

- El registro público está cerrado en producción y por defecto en desarrollo. El administrador crea cuentas employee y perfiles con datos verificados; enviar role, owner u otros campos no permitidos se rechaza.
- Administrador: gestiona perfiles y revisa solicitudes; puede consultar documentos para la demostración.
- Empleado: consulta su perfil y gestiona sus propios PDF y solicitudes; puede cancelar solo solicitudes pendientes.
- Las altas administrativas crean cuenta y perfil juntos en una transacción, con contraseña inicial oculta y bcrypt. Para corregir datos laborales se edita el perfil existente; también puede registrarse personal sin cuenta dejando el correo opcional vacío. Las cargas ficticias requieren ejecución explícita en un entorno de pruebas.
- Los adjuntos usados en solicitudes no se borran mientras estén referenciados.
- La sesión JWT dura dos horas, se guarda en cookie HttpOnly/Secure/SameSite=Strict en producción y usa protección CSRF para operaciones autenticadas. Logout revoca las sesiones anteriores de esa cuenta.
- El servidor verifica firma, audiencia, emisor, estado de cuenta y permisos en cada petición. Los roles no se aceptan del almacenamiento del navegador.
- Sin MongoDB no se informa éxito: /api/ready y operaciones de datos responden 503.
- El dominio @sesha.com no verifica la titularidad de un buzón; el administrador debe comprobar la identidad antes del alta. El registro de demostración solo se habilita expresamente sobre datos de desarrollo desechables.
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

La edición actual del 14/11/2026 contiene los cuatro PDF en `docs/pruebas/2026-11-14/` y copias idénticas en `output/pdf/`: [funcionales](docs/pruebas/2026-11-14/informe-pruebas-funcionales.pdf), [k6](docs/pruebas/2026-11-14/informe-rendimiento-k6.pdf), [ZAP local](docs/pruebas/2026-11-14/informe-seguridad-zap.pdf) y [ZAP autenticado en Vercel](docs/pruebas/2026-11-14/informe-seguridad-zap-vercel.pdf). Los dos JSON públicos y el índice de documentos permiten revisar datos, fechas, versión y número de páginas. Los registros privados y sesiones permanecen fuera de Git en `.qa/`; el archivo temporal de sesiones reales se retiró al finalizar el contraste.

La nueva campaña conserva 64 pruebas de backend y 21 de frontend de la misma versión y repite 48 verificaciones HTTP: 133 comprobaciones locales aprobadas, con 12 de publicación presentadas aparte. k6 confirmó 100 solicitudes/s durante 60 s (6.000 solicitudes, p95 166,4 ms); las etapas de 150 y 200/s y la confirmación de 125/s incumplieron umbrales. Login aprobó 3/s y superó límites a 4/s. ZAP local terminó con cuatro clases informativas y ninguna alta, media o baja. ZAP autenticado en Vercel conservó una alerta media de CORS en recursos públicos y cuatro informativas; las 22 peticiones activas no generaron alertas, los conteos de negocio se conservaron y la disponibilidad final fue HTTP 200. Estos resultados se limitan al alcance documentado.

Portal de informes: https://alexriver101219.github.io/PROYECTO_SENA/. Su fuente es la carpeta `/docs` de la rama `main`; no requiere modificar el despliegue de SESHA en Vercel.

La edición histórica del 13/11/2026 se conserva íntegra: 77 verificaciones funcionales, carga confirmada de 50/s y los hallazgos de ZAP correspondientes a aquella versión. No se mezclan con las métricas actuales. Ninguna de las dos campañas de k6 mide capacidad de Vercel/Atlas ni un número máximo de usuarios reales.

Procedimiento reproducible y alcance: [qa/README.md](qa/README.md). La edición actual usa `qa/export-current-results.cjs`, `qa/generate_current_reports.py` y `qa/build-report-index.cjs`. Los generadores anteriores se conservan para la evidencia histórica. Los PDF y herramientas QA se excluyen del paquete de despliegue de Vercel.

El informe histórico de ZAP en Vercel, del 13/11/2026, conserva sus dos alertas medias originales (CSP y CORS). La edición actual repite la revisión autenticada tras las correcciones, con sesiones iniciadas privadamente por el propietario y sin guardar contraseñas. Ambas versiones conservan la política acotada sobre paginación GET, sin carga ni escrituras de negocio durante el escaneo.

## Manual y respaldo de la entrega

El [manual ilustrado actualizado](docs/manual/2026-11-14/manual-usuario-sesha.pdf) tiene 11 páginas e incorpora el alta administrativa de producción y el cambio de contraseña, con capturas de referencia del login y del formulario vacío. Explica la clave actual, nueva clave y confirmación, los límites de 12 caracteres mínimos y 72 bytes máximos, y el cierre de sesiones anteriores. La aplicación corregida está publicada y verificada. Conserva las capturas históricas del 13/11/2026 para otros módulos y la revisión móvil emulada de 400 × 547 píxeles CSS; no se completó una nueva revisión visual de la aplicación por bloqueo de la herramienta. El respaldo se verificó otra vez el 14/11/2026. El [resumen de verificación](docs/manual/2026-11-14/verificacion-entrega.json) distingue estas evidencias y no incluye secretos ni el contenido del respaldo. La edición anterior permanece en su carpeta histórica.

Se crearon respaldos lógicos completos de `proyecto_sena` antes de las operaciones autorizadas y se verificaron sus restauraciones exclusivamente en MongoDB temporal local. Coincidieron documentos, opciones y los 11 índices de cinco colecciones; los contadores de seguridad varían entre capturas. El archivo privado más reciente está indicado por `.qa/latest-backup.json`, excluido de Git y Vercel. No incluye usuarios de Atlas, claves ni configuración de red. Procedimiento reproducible: `node qa/backup-and-verify.cjs`; conservar una segunda copia privada fuera del proyecto.

La constancia se descargó desde Edge. La carga y descarga de un PDF de prueba se comprobaron por API con igualdad de bytes, porque el control de aplicaciones no completó el selector nativo de archivos. Se retiraron el PDF y la solicitud de prueba y se conservaron los 152 perfiles. La revisión del formulario de registro no creó otra cuenta; la emulación móvil no sustituye una prueba en un teléfono físico.

## Referencias de despliegue

- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- https://vercel.com/docs/functions/limitations
