# Auditoría técnica de SESHA APP

> Diagnóstico inicial anterior a las correcciones. Consultar CAMBIOS_Y_VALIDACION.md para el estado actualizado.

Fecha: 12 de noviembre de 2026. Alcance: código del repositorio, rutas montadas en Express, modelos, frontend, configuración, pruebas, compilación y dependencias.

## Dictamen

El proyecto tiene una base útil para un prototipo académico, pero todavía no reúne condiciones de seguridad, integridad de datos y mantenimiento para producción. La separación entre React, Express y MongoDB es adecuada para su tamaño; los principales problemas están en la implementación y en la mezcla de funcionalidades demo con funcionalidades reales. No necesita microservicios: conviene consolidarlo como un monolito modular con responsabilidades claras.

Esta revisión no certifica cumplimiento normativo ni sustituye una prueba de penetración. No se accedió a una base de datos existente ni se verificaron infraestructura desplegada, TLS, permisos de MongoDB, copias de seguridad o exposición pública del repositorio. No se modificó código de la aplicación.

## Hallazgos por prioridad

### 1. Crítico: operaciones de negocio sin autenticación ni autorización

Referencias: `backend/server.js:69`, `backend/routes/documentos.js:8`, `backend/routes/documentos.js:50`, `backend/routes/solicitudes.js:8`, `backend/routes/solicitudes.js:50`, `backend/routes/solicitudes.js:70`, `backend/routes/empleados.js:72`.

Los routers de documentos y solicitudes no incorporan autenticación. Consultar, crear, modificar solicitudes y eliminar recursos queda expuesto a peticiones directas a la API. Crear empleados también es público. Proteger páginas con React no protege estas operaciones. La consulta de empleados comprueba firma JWT, pero no permisos o roles.

Comprobación: GET de documentos y solicitudes devolvió 200 sin token; POST vacío devolvió 201 con MongoDB desconectado. Con operaciones de persistencia sustituidas por dobles en memoria, DELETE de ambos módulos devolvió 200 y crear empleado devolvió 201 sin token. No se borraron ni crearon registros reales.

Corrección: autenticación común, denegación predeterminada, matriz de permisos por operación y control de propietario. Incluir propietario en documentos y solicitudes cuando corresponda; hoy sus esquemas no lo contemplan. Añadir pruebas que exijan 401/403 y rechacen accesos entre usuarios.

### 2. Crítico: accesos demo y secreto JWT de respaldo

Referencias: `backend/routes/auth.js:12`, `backend/routes/auth.js:63`, `backend/routes/auth.js:195`, `backend/routes/auth.js:210`.

Existe un acceso demo con credenciales fijas que emite tokens sin consultar MongoDB. Además, el login genera usuarios demo y los inserta si hay conexión. No hay restricción a desarrollo o pruebas. Si falta JWT_SECRET, el emisor usa un secreto literal conocido. El verificador de empleados usa directamente la variable de entorno, produciendo además una configuración incoherente cuando falta.

Comprobación: el acceso demo devolvió 200 y un token. No se reproducen aquí contraseñas ni tokens.

Corrección: retirar accesos fijos de producción, mover las semillas a un comando explícito de desarrollo y exigir un secreto apropiado al iniciar. Invalidar credenciales y tokens si esas configuraciones ya se utilizaron en un despliegue.

### 3. Crítico: el registro acepta conflictos de identidad y conserva la cuenta en memoria

Referencias: `backend/routes/auth.js:130`, `backend/routes/auth.js:147`, `backend/routes/auth.js:157`, `backend/routes/auth.js:213`.

El registro consulta primero solo el mapa en memoria, inserta allí la cuenta antes de persistir y tolera el error 11000 de MongoDB. Si el correo ya existe en MongoDB pero no en el mapa del proceso, responde 201 y emite un token para la cuenta recién introducida. El login prioriza ese mapa. Esto permite suplantar un correo existente dentro de ese proceso; no demuestra por sí solo acceso a recursos que hoy no están vinculados a un propietario.

Comprobación: simulando un error de duplicidad de MongoDB, el endpoint devolvió 201 y emitió un token. Se usó un correo sintético y ninguna base real.

Corrección: MongoDB debe ser la fuente de identidad; rechazar duplicados con 409 y no emitir tokens ante errores de persistencia. Eliminar el almacenamiento alternativo de autenticación en producción.

### 4. Alto: exposición de hashes de contraseñas

Referencias: `backend/routes/empleados.js:92`, `backend/routes/empleados.js:107`, `backend/models/User.js:16`.

El alta devuelve el documento completo y el listado usa find() sin excluir password. Los esquemas tampoco excluyen ese campo por defecto. Un hash no es la contraseña original, pero exponerlo facilita ataques fuera de línea.

Comprobación: la respuesta del alta, con save sustituido por un doble, contenía un hash bcrypt.

Corrección: respuestas con campos explícitos, password con select:false y exclusión en serialización. Seleccionar el hash expresamente solo durante el login.

### 5. Alto: colisión entre modelos de usuario y empleado

Referencias: `backend/models/User.js:25`, `backend/models/Empleado.js:14`, `backend/server.js:69`.

User.js registra el modelo Mongoose con el nombre Empleado y la colección empleados. Como auth se carga primero, Empleado.js reutiliza ese modelo con un esquema distinto al que declara. En las rutas actuales, nombre, documento y cargo no forman parte del esquema efectivo; sus campos y validaciones no se aplican como se espera. Los roles tampoco están definidos en el esquema efectivo.

Comprobación: User === Empleado resultó true; el esquema efectivo contenía name, email y password, además de campos internos y timestamps.

Corrección: decidir si existe una cuenta con perfil laboral asociado o una entidad única. Registrar cada modelo una sola vez, definir roles y relaciones y preparar una migración para los datos ya existentes.

### 6. Alto: respuestas de éxito sin persistencia

Referencias: `backend/routes/documentos.js:10`, `backend/routes/documentos.js:27`, `backend/routes/solicitudes.js:10`, `backend/routes/solicitudes.js:27`, `backend/server.js:95`.

Sin MongoDB, las consultas devuelven listas vacías y las altas devuelven 201 sin guardar. Esto oculta incidentes y hace creer al usuario que su trámite quedó registrado. El servidor también puede iniciar sin MONGO_URI y anunciar estado Online.

Corrección: validar configuración al arrancar, informar indisponibilidad con 503 y separar comprobaciones de vida y disponibilidad. Emitir éxito únicamente después de persistir. Las migraciones de índices deben ejecutarse de forma controlada, no como una limpieza implícita en cada arranque (`server.js:105`).

### 7. Alto: módulos del frontend aún simulados

Referencias: `Style/login_app/src/pages/Empleados.jsx:21`, `Style/login_app/src/pages/Solicitudes.jsx:47`, `Style/login_app/src/pages/Documentos.jsx:48`, `Style/login_app/src/pages/Perfil.jsx:17`, `Style/login_app/src/pages/Dashboard.jsx:49`.

Empleados carga datos fijos y mantiene cambios en estado local. Solicitudes simula el envío con setTimeout. Cargar documentos solo valida el archivo y muestra éxito; no lo transmite. El perfil y los indicadores contienen datos de ejemplo. Los cambios de estos módulos no constituyen persistencia real.

El certificado se genera en el navegador a partir de localStorage y texto fijo (`Documentos.jsx:12`), mientras la interfaz anuncia firma digital verificada (`Documentos.jsx:86`). Dibujar texto de firma en un PDF no implementa una firma criptográfica verificable.

Corrección: integrar las pantallas con contratos de API definidos y persistencia real. Mostrar datos demo explícitamente como demostración. Generar certificados desde información autorizada del servidor y retirar afirmaciones de firma verificada hasta implementar esa capacidad.

### 8. Alto: dependencias con avisos conocidos

Se ejecutó npm audit --json con consulta al registro npm. Resultados del árbol completo:

| Proyecto | Bajas | Moderadas | Altas | Críticas | Total |
| -------- | ----: | --------: | ----: | -------: | ----: |
| Backend  |     1 |        14 |     9 |        3 |    27 |
| Frontend |    16 |        13 |    25 |        3 |    57 |

Estos son paquetes señalados por npm, no un conteo de ataques demostrados ni de CVE únicas. Incluyen herramientas y dependencias transitivas; el riesgo real depende del entorno y de las funciones utilizadas. En backend aparecen mongoose, proxy-addr y tar con severidad crítica. En frontend aparecen dompurify, proxy-addr y shell-quote con severidad crítica. También hay avisos altos en dependencias directas como axios y bcrypt.

Corrección: revisar las cadenas, distinguir ejecución de producción y herramientas de desarrollo, actualizar con cambios controlados y repetir pruebas y compilación. No aplicar audit fix --force automáticamente: algunas propuestas implican cambios mayores y el reporte llegó a proponer react-scripts 0.0.0.

### 9. Alto si está en uso: configuración sensible versionada

Referencia: `backend/routes/.env.production:4`; confirmado con git ls-files.

El archivo está rastreado por Git y contiene JWT_SECRET. MONGO_URI parece una plantilla y no tiene sintaxis de credenciales incrustadas; no se confirmó que una credencial real de MongoDB esté expuesta. El archivo está dentro de routes y dotenv.config() no lo carga expresamente. No se comprobó que ese secreto JWT se utilice en ningún entorno.

Corrección: retirar valores sensibles del seguimiento, conservar únicamente un ejemplo sin secretos y configurar variables fuera del repositorio. Si ese JWT_SECRET se ha utilizado, rotarlo e invalidar tokens asociados. .gitignore no retira archivos ya rastreados ni borra su historial. No se imprimieron sus valores durante la revisión.

### 10. Medio: validación y manejo de errores insuficientes

Referencias: `backend/routes/auth.js:118`, `backend/routes/empleados.js:85`, `backend/routes/solicitudes.js:52`, `backend/routes/documentos.js:44`.

No hay validación uniforme de tipos, tamaños y campos permitidos. findByIdAndUpdate recibe el cuerpo directamente y omite runValidators. Varias rutas exponen error.message y devuelven 500 para errores de entrada; tampoco distinguen siempre un recurso inexistente. La longitud mínima del hash en un esquema no valida la longitud de la contraseña original.

Comprobación: el registro aceptó una contraseña de un carácter en la prueba sintética. La comprobación de longitud del frontend puede eludirse llamando a la API.

Corrección: validación de entrada en servidor, listas explícitas de campos, validación de identificadores y actualizaciones, estados 400/404/409 consistentes y middleware centralizado de errores que no exponga detalles internos. Si la pertenencia a la empresa es un requisito, comprobar el correo o usar invitaciones; endsWith('@sesha.com') no demuestra titularidad.

### 11. Medio: sesión y autenticación duplicadas

Referencias: `Style/login_app/src/components/ProtectedRoute.jsx:5`, `Style/login_app/src/context/AuthContext.jsx:12`, `Style/login_app/src/pages/Register.jsx:61`, `Style/login_app/src/components/Header.jsx:9`, `backend/middlewares/authMiddleware.js:9`.

ProtectedRoute acepta cualquier cadena no vacía como token; el contexto restaura la sesión sin consultar al servidor. No hay tratamiento central de expiración o respuestas 401. Registrar guarda token pero no actualiza el contexto ni el usuario; Header elimina solo token, dejando usuario y contexto anteriores. Esto puede mostrar identidad y datos desactualizados al cambiar de cuenta.

Los tokens se guardan en localStorage, accesible a JavaScript si aparece una vulnerabilidad XSS; esta revisión no demostró XSS. El middleware authMiddleware.js solo comprueba que haya una cadena Bearer y no verifica su firma, aunque actualmente no se usa en las rutas montadas. No es un bypass activo de esas rutas, pero no debe reutilizarse como autenticación válida.

Corrección: una única implementación de autenticación backend y una única fuente de estado frontend. Validar sesión con el servidor, manejar expiración y limpiar todo el estado al salir. Evaluar cookies HttpOnly/Secure/SameSite con protección CSRF, o documentar y mitigar los riesgos del mecanismo de tokens elegido.

### 12. Medio: arquitectura y herramientas inconsistentes

Referencias: `backend/routes/userRoutes.js:4`, `backend/controllers/authcontrollers.js:1`, `Style/login_app/src/App.js`, `Style/login_app/src/App.jsx`, `Style/login_app/vite.config.js`, `Style/login_app/package.json`.

Hay rutas y controladores alternativos que importan archivos inexistentes; no están montados y por eso no bloquean hoy el arranque. Existen tres implementaciones de conexión a MongoDB y dos App con rutas distintas. Los scripts del frontend usan react-scripts mientras persiste una configuración Vite; la API usa REACT_APP_API_URL y el entorno versionado declara VITE_API_URL. También hay dependencias de servidor en el frontend y bcrypt/bcryptjs duplicados.

Header importa Header.css con mayúscula, mientras Git registra styles/header.css. Compila en este Windows, pero puede fallar en un entorno con rutas sensibles a mayúsculas.

Corrección: un punto de entrada por aplicación, un único sistema de compilación, configuración coherente y eliminación del código alternativo sin uso. Organizar cada módulo como rutas, controladores, servicios y modelos; centralizar configuración, autenticación y errores. Separar la creación de app del arranque y conexión. El README actual no documenta instalación, variables, ejecución ni despliegue.

### 13. Medio: las comprobaciones actuales no garantizan calidad ni seguridad

Referencias: `backend/test/documentos.test.js:5`, `backend/test/solicitudes.test.js:5`, `backend/test/auth.test.js:9`, `backend/package.json`, `Style/login_app/src/tests/Documentos.test.jsx:5`, `Style/login_app/eslint.config.mjs:16`, `backend/eslint.config.mjs:13`.

Los tests de documentos y solicitudes esperan éxito sin autenticación y pasan sin base de datos. Varias pruebas de frontend solo comprueban que renderizar no arroje una excepción. Las de backend pueden tomar MONGO_URI del entorno y crear datos sin limpieza; deben aislarse antes de usarse en automatización. --forceExit oculta recursos que permanecen abiertos.

ESLint del frontend tiene rules vacío y el del backend solo aplica formato con Prettier. Ambos comandos pasan, pero no verifican las reglas habituales de errores, hooks o prácticas de seguridad. No se encontraron workflows de CI versionados.

Corrección: reglas de lint útiles, pruebas de permisos y casos negativos, persistencia y recuperación de errores, flujos de usuario y una base temporal para integración con limpieza garantizada. Añadir CI con instalación reproducible, lint, pruebas, compilación y revisión de dependencias.

## Verificación ejecutada

| Comprobación                                                          | Resultado                                                                    |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Frontend: npm.cmd test -- --runInBand, con CI=true                    | 6 suites y 8 pruebas aprobadas                                               |
| Frontend: npm.cmd run build                                           | Compilación aprobada en Windows                                              |
| Backend: npm.cmd test                                                 | 4 pruebas aprobadas; 5 fallidas por conexión y hooks dependientes de MongoDB |
| Lint en ambas aplicaciones                                            | Aprobado, con las limitaciones de reglas indicadas                           |
| npm audit en ambas aplicaciones                                       | Avisos encontrados; cifras arriba                                            |
| Comprobaciones aisladas de API con Supertest y dobles de persistencia | Confirmaron los comportamientos descritos sin acceder a una BD real          |

Para las pruebas de backend se fijó MONGO_URI a 127.0.0.1:1 con timeout corto, NODE_ENV=test y un secreto sintético. No había una instancia de MongoDB de prueba disponible en ese destino; por tanto los cinco fallos no demuestran por sí solos defectos funcionales de los casos que requieren BD. Su integración real queda pendiente. Las cuatro pruebas que pasan sí confirman el comportamiento sin persistencia.

Entorno observado: Node v23.3.0. Conviene fijar y comprobar una versión LTS compatible con las herramientas elegidas. No se modificaron dependencias ni archivos de bloqueo.

## Aspectos positivos

- Separación física entre frontend y backend y componentes reutilizables en React.
- Cliente HTTP centralizado y contexto de autenticación que pueden consolidarse.
- Hash bcrypt, expiración de JWT y verificación de firma en la consulta de empleados.
- Helmet, lista explícita de orígenes CORS, límite de JSON y límite de peticiones global.
- Esquemas Mongoose, archivos de bloqueo y una base inicial de pruebas.

Estas medidas ayudan, pero no compensan la ausencia de autorización. El login también recalcula sincrónicamente veinte hashes y consulta o crea demos en cada intento (`auth.js:11`, `auth.js:210`); mover ese trabajo fuera de las peticiones y añadir controles específicos de intentos de login.

## Orden recomendado de trabajo

1. Cerrar operaciones públicas, retirar demos de producción, hacer obligatorio el secreto y resolver conflictos de registro. Rotar secretos si fueron utilizados.
2. Corregir modelos y exposición de hashes; asegurar persistencia real y respuestas de error fiables.
3. Definir roles, propietarios y contratos de API e integrar módulos del frontend.
4. Actualizar dependencias con validación de compatibilidad y consolidar arquitectura, configuración y sesión.
5. Completar pruebas con BD temporal, CI y documentación operativa; después validar el despliegue.

## Referencias de buenas prácticas

- [OWASP: autorización](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): denegar por defecto y comprobar permisos en cada petición.
- [Express: seguridad en producción](https://expressjs.com/en/advanced/best-practice-security/): validación de entradas, protección del login, configuración segura y revisión de dependencias.

Los hallazgos se basan en el código y las verificaciones locales. Estas referencias fundamentan los criterios de revisión; no implican una certificación formal de OWASP.
