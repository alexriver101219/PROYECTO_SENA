# Correcciones y validación de SESHA APP

Fecha: 12 de noviembre de 2026. Código preparado para una exposición académica con Vercel y MongoDB Atlas.

## Resultado

Se corrigieron los hallazgos del diagnóstico inicial en el código y la configuración. Por instrucción del autor, se mantiene la contraseña académica del administrador: admin@sesha.com / 123456. Su ingreso ahora requiere una cuenta persistida, creada mediante una semilla explícita; ya no existe un bypass del login.

No se publicó en Vercel, no se ejecutó la migración ni la semilla contra Atlas y no se reescribió el historial de Git. El archivo de entorno rastreado se retiró del árbol de trabajo; sus versiones históricas siguen en Git. Configurar un JWT_SECRET nuevo al publicar si el anterior se utilizó en algún entorno.

## Cambios principales

| Hallazgo inicial | Corrección |
| --- | --- |
| Operaciones sin autenticación | Autenticación común, permisos de administrador y filtros de propietario |
| Login demo y JWT de respaldo | Login contra MongoDB; sin secreto por defecto; contraseña académica conservada en la semilla |
| Registro con identidad duplicada | Persistencia antes de iniciar sesión, índice único, error 409 y ausencia de mapas alternativos |
| Hashes expuestos | Password excluido de consultas y serialización |
| Colisión de modelos | User para cuentas históricas y Empleado para perfiles independientes |
| Éxito sin guardar | Errores 503 y comprobaciones separadas de vida/disponibilidad |
| Pantallas simuladas | Empleados, solicitudes, documentos, perfil e indicadores conectados a la API |
| PDF desde datos manipulables | Constancia generada por servidor con el perfil autenticado, identificada como académica |
| Subidas sin persistencia | PDF guardados en MongoDB, hasta 3 MB, con verificación de tipo y cabecera, descarga restringida y como adjunto |
| Sesión inconsistente | Cookie HttpOnly, Secure en producción, SameSite Strict, CSRF y revocación al salir |
| Herramientas duplicadas | Un único frontend Vite y una instalación npm mediante workspaces |
| Dependencias vulnerables | Actualizaciones, versiones fijadas y override específico de minimatch |
| Reglas y pruebas insuficientes | ESLint con reglas efectivas, Vitest, integración con MongoDB temporal y CI |
| Configuración de despliegue ausente | Entrada serverless, rutas SPA/API, cabeceras, reutilización de conexión y guía de Vercel |
| Índices modificados al arrancar | Migración explícita y repetible; pruebas de idempotencia |
| Limitación local a cada proceso | Contadores atómicos compartidos en MongoDB con expiración TTL |

Los registros históricos sin propietario o sin contenido no se reconstruyen ni se asignan automáticamente a una persona. Permanecen para revisión del administrador. Un registro sin archivo devuelve 410 al intentar descargarlo.

## Comprobaciones realizadas

| Comprobación | Resultado |
| --- | --- |
| Integración del backend | 18 pruebas aprobadas |
| Componentes y sesión del frontend | 13 pruebas aprobadas en 8 archivos |
| Análisis ESLint | Backend y frontend aprobados sin advertencias |
| Compilación Vite | Aprobada |
| npm audit del árbol completo | 0 vulnerabilidades conocidas reportadas |
| npm ci en directorio aislado, dry-run offline | Archivo de bloqueo y manifiestos compatibles; no equivale a ejecutar CI en Linux |
| Comprobación HTTP local | Ruta React, proxy, ingreso académico, cookie/CSRF, guardado y consulta de solicitud y cierre de sesión aprobados |
| Entrada serverless | Rutas y respuesta 503 por configuración ausente verificadas |
| git diff --check | Aprobado |

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
