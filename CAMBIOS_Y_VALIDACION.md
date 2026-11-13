# Correcciones y validación de SESHA APP

Fecha: 12 de noviembre de 2026. Código preparado para una exposición académica con Vercel y MongoDB Atlas.

## Resultado

Se corrigieron los hallazgos del diagnóstico inicial en el código y la configuración. Por instrucción del autor, se mantiene la contraseña académica del administrador: admin@sesha.com / 123456. Su ingreso ahora requiere una cuenta persistida, creada mediante una semilla explícita; ya no existe un bypass del login.

No se publicó en Vercel, no se ejecutó la migración ni la semilla contra Atlas y no se reescribió el historial de Git. El archivo de entorno rastreado se retiró del árbol de trabajo; sus versiones históricas siguen en Git. Configurar un JWT_SECRET nuevo al publicar si el anterior se utilizó en algún entorno.

## Cambios principales

| Hallazgo inicial                    | Corrección                                                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Operaciones sin autenticación       | Autenticación común, permisos de administrador y filtros de propietario                                        |
| Login demo y JWT de respaldo        | Login contra MongoDB; sin secreto por defecto; contraseña académica conservada en la semilla                   |
| Registro con identidad duplicada    | Persistencia antes de iniciar sesión, índice único, error 409 y ausencia de mapas alternativos                 |
| Hashes expuestos                    | Password excluido de consultas y serialización                                                                 |
| Colisión de modelos                 | User para cuentas históricas y Empleado para perfiles independientes                                           |
| Éxito sin guardar                   | Errores 503 y comprobaciones separadas de vida/disponibilidad                                                  |
| Pantallas simuladas                 | Empleados, solicitudes, documentos, perfil e indicadores conectados a la API                                   |
| PDF desde datos manipulables        | Constancia generada por servidor con el perfil autenticado, identificada como académica                        |
| Subidas sin persistencia            | PDF guardados en MongoDB, hasta 3 MB, con verificación de tipo y cabecera, descarga restringida y como adjunto |
| Sesión inconsistente                | Cookie HttpOnly, Secure en producción, SameSite Strict, CSRF y revocación al salir                             |
| Herramientas duplicadas             | Un único frontend Vite y una instalación npm mediante workspaces                                               |
| Dependencias vulnerables            | Actualizaciones, versiones fijadas y override específico de minimatch                                          |
| Reglas y pruebas insuficientes      | ESLint con reglas efectivas, Vitest, integración con MongoDB temporal y CI                                     |
| Configuración de despliegue ausente | Entrada serverless, rutas SPA/API, cabeceras, reutilización de conexión y guía de Vercel                       |
| Índices modificados al arrancar     | Migración explícita y repetible; pruebas de idempotencia                                                       |
| Limitación local a cada proceso     | Contadores atómicos compartidos en MongoDB con expiración TTL                                                  |

Los registros históricos sin propietario o sin contenido no se reconstruyen ni se asignan automáticamente a una persona. Permanecen para revisión del administrador. Un registro sin archivo devuelve 410 al intentar descargarlo.

## Comprobaciones realizadas

| Comprobación                                  | Resultado                                                                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Integración del backend                       | 18 pruebas aprobadas                                                                                             |
| Componentes y sesión del frontend             | 13 pruebas aprobadas en 8 archivos                                                                               |
| Análisis ESLint                               | Backend y frontend aprobados sin advertencias                                                                    |
| Compilación Vite                              | Aprobada                                                                                                         |
| npm audit del árbol completo                  | 0 vulnerabilidades conocidas reportadas                                                                          |
| npm ci en directorio aislado, dry-run offline | Archivo de bloqueo y manifiestos compatibles; no equivale a ejecutar CI en Linux                                 |
| Comprobación HTTP local                       | Ruta React, proxy, ingreso académico, cookie/CSRF, guardado y consulta de solicitud y cierre de sesión aprobados |
| Entrada serverless                            | Rutas y respuesta 503 por configuración ausente verificadas                                                      |
| git diff --check                              | Aprobado                                                                                                         |

Las pruebas usan MongoDB temporal con datos sintéticos, sin leer el archivo de entorno de producción ni conectarse a Atlas. Se descargó el binario oficial de MongoDB para la integración. Los servidores temporales de comprobación se cerraron al terminar.

La revisión visual en un navegador no pudo realizarse porque el host de acceso al navegador estaba indisponible. La compilación y las pruebas de componentes no sustituyen esa revisión. El workflow de GitHub Actions se preparó, pero no se ejecutó remotamente en esta sesión.

## Pasos pendientes en los servicios reales

1. Usar Node.js 24 LTS.
2. Configurar MONGO_URI, JWT_SECRET, APP_ORIGIN y NODE_ENV en el proyecto de Vercel.
3. Conservar una copia de la base existente y ejecutar npm run migrate y npm run seed con las variables de la base académica elegida.
4. Publicar desde la raíz del repositorio y verificar el flujo en la URL real.
5. Usar únicamente información ficticia en la exposición: la cuenta administradora conserva credenciales conocidas por decisión del autor.

El procedimiento completo y los permisos de las cuentas están en [README.md](README.md). La preparación de los archivos y su comprobación local están terminadas; la validación del despliegue requiere la publicación en tu proyecto de Vercel.

## Corrección posterior: pantalla en blanco al ingresar

El diagnóstico local registró `useContext: dispatcher is null`, con React y su renderizador cargados desde dos versiones de caché de Vite en la misma página. Se fijó la resolución única de React y React DOM y se incluyeron sus entradas de ejecución en la optimización inicial. Se verificó que los módulos servidos compartan la misma versión de caché.

Se agregó una prueba del ingreso con la aplicación y navegación completas, una pantalla de recuperación ante errores de render y diagnóstico limitado al servidor local de desarrollo. También se fijó el color de texto del tema claro para las pantallas privadas. Las 13 pruebas del frontend, ESLint y la compilación pasan. Una pestaña abierta con módulos antiguos necesita recarga completa con Ctrl+Shift+R.

## Constancias laborales personalizadas

Se unificaron los botones de Documentos y Mi perfil bajo la constancia laboral de Sesha. Incluye nombre autenticado, documento ficticio, cargo, área, fecha de ingreso persistida y fecha de expedición actual en America/Bogota. La fecha de ingreso puede editarse desde Empleados y no admite fechas futuras o imposibles.

Se completaron en Atlas los 29 perfiles faltantes y las fechas de ingreso de los 123 perfiles existentes. Las 152 cuentas tienen ahora datos laborales completos; se conservaron contraseñas y datos previamente válidos. Los registros nuevos crean cuenta y perfil en una transacción, y las pruebas utilizan un replica set temporal para comprobar la reversión ante fallos.

Validación de esta actualización: 22 pruebas de backend y 15 de frontend aprobadas, ESLint y compilación aprobados; PDF renderizados y revisados en una sola página, incluyendo campos de longitud máxima. Se comprobó la descarga personalizada con tres usuarios de la demostración local, conservando sus datos temporales al reiniciar el backend. No se desplegó ni se subieron estos cambios automáticamente a GitHub.

La plantilla compartida incluye ahora el logotipo existente de Sesha y una firma ficticia de Mariana Isabel Torres Ríos, Directora de Talento Humano. La firma manuscrita utiliza Allura, distribuida con su licencia OFL en backend/assets/fonts. Se incluyen los recursos en la configuración de Vercel. Se revisaron visualmente el PDF normal y el caso con campos de longitud máxima, ambos en una página; las 22 pruebas del backend y ESLint pasan.

## Reanudación: 13 de noviembre de 2026

Se encontró un fallo de acceso local: Windows resuelve `localhost` únicamente a `::1`, mientras Vite estaba escuchando exclusivamente en `127.0.0.1:5173`. Antes del cambio, `http://localhost:5173/` devolvía `ECONNREFUSED` y la dirección IPv4 respondía 200. Se cambió el host de Vite a `localhost` y se activó `strictPort` para evitar cambios silenciosos de puerto. Después, la página, las rutas de React, los módulos JavaScript y `/api/ready` responden 200 desde `localhost`.

Se verificaron por HTTP el ingreso académico, la cookie de sesión, el perfil laboral, el dashboard, los listados de empleados, documentos y solicitudes, y la descarga de una constancia con cabecera PDF válida. El dashboard local informa 152 perfiles activos. La comprobación del acceso existente fue de lectura; no se ejecutaron migraciones ni semillas sobre Atlas.

El Node predeterminado del equipo es 23.3.0 y no es compatible con las dependencias actuales de pruebas. Con ese ejecutable, los workers del frontend fallaban al cargar `undici`. Se descargó Node 24.22.3 en la caché ignorada del proyecto, sin cambiar la instalación global. Con Node 24, ESLint, las 22 pruebas de backend, las 15 de frontend y la compilación pasan. La auditoría de npm informa 0 vulnerabilidades.

La primera revisión encontró publicado el commit `86a8821` de ayer, con Node 24 y las cinco variables de producción registradas. El sitio público y `/api/health` respondían 200, pero `/api/ready` devolvía 503. Tras ajustar el acceso de red en Atlas, la misma API respondió 200 con `ready`, sin modificar sus credenciales ni ejecutar migraciones. Se confirmó así el bloqueo de red. La regla temporal propuesta fue `0.0.0.0/0` durante seis horas: al caducar, el acceso desde Vercel volverá a depender de las reglas de red vigentes.

La verificación posterior del sitio público detectó otro fallo: `/api/documentos/certificado` devolvía 500 y Vercel registraba `MODULE_NOT_FOUND`. El trazado de archivos de la función omitía las fuentes estándar que PDFKit 0.20.2 carga dinámicamente mediante sus imports internos. Se reprodujo el error en una copia aislada con solo los archivos trazados y se comprobó que incluir `node_modules/pdfkit/js/standard-fonts/**` permite generar el PDF. Se agregó ese patrón a `vercel.json` y se excluyó `output/**` de las fuentes enviadas a Vercel.

Se preparó el despliegue `dpl_Abwgxh31ingsiEqBqRS2YSGebwtu` desde los archivos locales, basado en `86a8821` más las correcciones de esta sesión, inicialmente sin asignarle el dominio público. Tras verificarlo con las cuentas académicas, se promovió a producción en https://sesha-app.vercel.app. Se comprobaron por HTTP la página, salud y disponibilidad, ingreso de administrador y empleado, perfil, dashboard, listados y ambas constancias PDF válidas. El empleado obtiene 403 al consultar Empleados, como corresponde. Los registros del nuevo despliegue no mostraron errores durante la comprobación. No se crearon ni borraron documentos, solicitudes o perfiles en Atlas durante estas pruebas.

La CLI creó automáticamente una clave de acceso de automatización para probar la versión protegida. Se revocó únicamente esa clave al terminar y se conservó la protección de Vercel. No se modificaron las variables de entorno ni se hicieron commits o push a GitHub; la publicación se realizó desde la copia local.

La revisión visual sigue pendiente: el host de acceso al navegador no está disponible y el control de Firefox fue bloqueado por la herramienta porque no admite aplicar su política de URL en ese navegador. Las comprobaciones HTTP y las pruebas de componentes no equivalen a una revisión visual.

## Acceso estable elegido

El autor aprobó la opción sin costo adicional: convertir la entrada `0.0.0.0/0` en permanente para la demostración académica. Se documentó el procedimiento en README.md; su aplicación y la ausencia de vencimiento aún requieren confirmación desde Atlas. También se identificó que la base configurada es `proyecto_sena`, para preparar posteriormente un usuario exclusivo con `readWrite` limitado a esa base.

Confirmación posterior del autor: editó la entrada existente `0.0.0.0/0`, agregó el comentario `SESHA APP - acceso Vercel` y guardó. La captura de **Edit IP Access List Entry** no mostraba controles de duración temporal; el autor volvió a abrir **EDIT** y confirmó que no aparecen horas ni vencimiento. Se registra la entrada como permanente según esa revisión de la interfaz, sin una lectura independiente mediante la API de Atlas. Queda pendiente preparar el usuario exclusivo con `readWrite` limitado a `proyecto_sena`; no se han cambiado sus credenciales ni permisos.

Se abrió Microsoft Edge, pero el control automático fue bloqueado porque la herramienta no pudo determinar la URL actual con suficiente confianza. No se cambió la configuración de Atlas mediante el navegador y no se contrataron servicios de pago.

La captura posterior mostraba **Add IP Access List Entry**, aunque se pretendía modificar la entrada temporal existente. Se identificó un posible intento de duplicación; no se confirmó porque la captura no mostraba un error de guardado. La nueva comprobación HTTP del sitio, `/api/health` y `/api/ready` devolvió 200, con `ready` en la última ruta. Esto confirma disponibilidad actual, pero no demuestra que la regla sea permanente. Se propuso conectar la integración MongoDB Atlas para inspeccionar y aplicar la configuración directamente; la conexión y los cambios siguen pendientes de confirmación.

## Confirmación del origen de los datos locales

Se revisó la versión histórica `e0b7ab4`: el frontend usaba `react-scripts start`, que abría el navegador, y el servidor podía arrancar sin `MONGO_URI`. Su autenticación incluía usuarios en un `Map` de memoria y un ingreso académico de administrador independiente de MongoDB. Por tanto, abrir la aplicación o entrar con la cuenta académica en esa versión no demostraba que los datos estuvieran persistidos en Atlas.

En la comprobación actual, `backend/.env` apunta a un host Atlas y a `proyecto_sena`. Se realizó un `ping` directo y se compararon el total y una huella de los identificadores de los diez perfiles más recientes con `/api/empleados` del backend local: coincidieron, con 152 perfiles en ambos. La conexión de comprobación desactivó creación automática e índices y no modificó datos laborales. El proceso local fue identificado como `node server.js`. La interfaz local tuvo inicialmente un 502 por ausencia del backend; posteriormente el puerto 8000 quedó activo y `/api/ready` respondió 200. Esta evidencia confirma que la aplicación local actual utiliza los datos de Atlas.

## Cambio a la cuenta de aplicación con permisos limitados

El autor creó `sesha_app_srv` con autenticación SCRAM y `readWrite@proyecto_sena`, y confirmó haber retirado el usuario X.509 creado por error. La nueva contraseña se recibió en un archivo local temporal, excluido de Git y Vercel, sin mostrarla en herramientas ni mensajes. Se comprobó el acceso directo a Atlas: `ping` aprobado, 152 perfiles y `connectionStatus` con exactamente un rol, `readWrite` sobre `proyecto_sena`.

Se sustituyó `MONGO_URI` en `backend/.env` y como secreto del entorno de producción de `alex-1364/sesha-app`. Se reinició únicamente el backend identificado en el puerto 8000 y se volvió a iniciar Vite en `http://localhost:5173`. Se verificaron localmente la página, disponibilidad, ingreso de administrador y empleado, perfil, dashboard, listados y ambas constancias PDF. El empleado recibe 403 en Empleados.

Se preparó el despliegue `dpl_AknwdeZ4XQ5Az4uCPMT5Ncxf24oq`, inicialmente sin dominio público, con la nueva variable. Tras superar las mismas comprobaciones HTTP, se promovió a `https://sesha-app.vercel.app` y se confirmó que el dominio apunta a ese despliegue. La verificación pública pasó para ambas cuentas: API disponible, sesiones HttpOnly/Secure con CSRF, listados, constancias y permisos. Los registros del nuevo despliegue no mostraron errores en la ventana de comprobación. El código de negocio no cambió en esta operación; no se repitieron las pruebas unitarias ya aprobadas porque el cambio fue de credenciales y se verificó el flujo real.

Se revocó el acceso temporal de automatización utilizado para probar el despliegue protegido y se eliminó `.qa/sesha-app-password.txt`. Las credenciales operativas permanecen únicamente en la configuración privada necesaria. No se eliminaron perfiles, documentos ni solicitudes, y la cuenta administradora de Atlas se conserva para mantenimiento. No se hicieron commits ni push durante esta operación.
# Evidencias de pruebas del 13/11/2026

- Funcionales: 22 casos de backend + 15 de frontend + 40 HTTP, todos aprobados; lint y compilación correctos. Persistencia real en MongoDB temporal, datos sintéticos, sin carga ni escaneo activo en Atlas/Vercel.
- k6 2.3.0: confirmación local de 50 solicitudes/s durante 60 s, 3.000 respuestas, p95 33,4 ms y cero errores/descartes. Pico de 125/s durante 25 s aprobado; confirmaciones de 100/s y 125/s durante 60 s fallaron por descartes (y 10 errores HTTP en 125/s). Login de 3/s durante 20 s aprobado; 4/s excedió el objetivo p95 de 1 s.
- No extrapolar a usuarios reales ni capacidad de la nube: generador, API y base temporal compartieron un portátil i3-N300 con 7,73 GiB RAM y 0,65 GiB libres al inicio.
- Protección por IP comprobada con límites activos: solicitud API 121 bloqueada en la ventana de 60 s y autenticación 21 bloqueada en 15 minutos. PDF de exactamente 3 MiB aceptado y +1 byte rechazado; JSON mayor que 16 KiB rechazado.
- ZAP 2.17.0: ejecución final código 0; 0 clases altas, 1 media, 1 baja y 4 informativas. CSP style-src unsafe-inline requiere seguimiento; X-Powered-By procede del servidor estático auxiliar y no apareció en las cuatro rutas públicas comprobadas. Sin explotación XSS ni filtración de secretos demostrada. npm audit: cero vulnerabilidades.
- Tres PDF revisados en `docs/pruebas/2026-11-13/`, más resultados sanitizados. Portal estático en `docs/index.html`. Las evidencias privadas permanecen en `.qa/`, ignoradas por Git y Vercel.
