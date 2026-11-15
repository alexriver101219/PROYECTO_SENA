# Validación de SESHA APP — 14 de noviembre de 2026

## Actualización tras la remediación autorizada

El propietario autorizó corregir el destino de producción. Se desactivaron las 120 cuentas demo y se revocaron sus sesiones mediante una transacción, tras un respaldo restaurado y verificado localmente. Cuentas, contraseñas, roles, perfiles y otras cuentas quedaron conservados. La lectura posterior confirmó cero demos activas y ninguna coincidencia de las claves históricas de admin, Carlos o Laura con sus hashes actuales.

Se sustituyó el secreto JWT local y se actualizó el de producción como secreto sensible en Vercel, con valores criptográficos independientes y sin registrarlos. La activación de producción requiere el nuevo despliegue. La comparación dirigida posterior no encontró ningún secreto configurado en código, compilado, PDF o historial.

La nueva campaña aprobó 48 comprobaciones HTTP y los dos límites de peticiones. Se añadieron pruebas de cuarentena, reversión, alta administrativa, registro de producción cerrado y retirada del JWT anterior. ZAP repetido terminó correctamente con solo alertas informativas: ya no aparecen las alertas media de CSP ni baja de cabecera. La verificación visual de la aplicación se bloqueó al no poder determinar la URL; el PDF actualizado sí se renderizó y revisó. Véase [arquitectura y operación](ARQUITECTURA_Y_PRODUCCION.md).

Los resultados siguientes se conservan como **diagnóstico previo a la remediación**, no como estado actual de las credenciales.

## Resultado

Las pruebas funcionales pasan, pero **la revisión de seguridad no está cerrada**. Se confirmaron dos riesgos de credenciales vigentes. No se muestran contraseñas, hashes ni tokens en este informe.

1. **Secreto JWT local expuesto:** el valor configurado coincide exactamente con un literal de pruebas del historial de Git. Hay ocho apariciones en parches de cuatro commits; no son ocho claves diferentes. La eliminación del literal del código actual no revoca el secreto. No se verificó el valor actual de Vercel.
2. **120 cuentas demo con contraseña publicada:** en `cluster1.nopuzfk.mongodb.net/proyecto_sena`, colección `empleados`, se encontraron 120 cuentas demo activas cuyos hashes todavía aceptan una contraseña histórica expuesta. Se comparó bcrypt en memoria mediante lectura, sin intentar iniciar sesión, sin registrar hashes y sin efectuar escrituras.

Las contraseñas históricas de `admin@sesha.com`, `carlos.mendoza@sesha.com` y `laura.gomez@sesha.com` **ya no coinciden** con sus hashes actuales. No se conocen ni se comprobaron sus nuevas claves.

## Pruebas ejecutadas

| Comprobación | Resultado |
| --- | --- |
| Backend, Node 24.22.3 | 48/48 aprobadas |
| Frontend, Node 24.22.3 | 19/19 aprobadas |
| HTTP con MongoDB temporal | 47/47 aprobadas |
| Límites de peticiones | API bloquea petición 121/min; autenticación bloquea intento 21/15 min, HTTP 429 |
| Lint y compilación | Correctos |
| Árbol de dependencias instalado | Sin problemas informados por npm ls |
| npm audit, producción y desarrollo | 487 dependencias, 0 vulnerabilidades conocidas |
| PDF, copias, imágenes y enlaces de publicación | Verificación aprobada |
| Espacios/errores de parche | git diff --check aprobado |
| Conexión a Atlas con Node 24 | Ping e inspección de dos cuentas aprobados, modo solo lectura |

Son **114 comprobaciones funcionales aprobadas**, además de las dos comprobaciones de límites. Cubren autenticación, permisos, documentos, solicitudes, constancias, validaciones y cambio de contraseña. La rotación verifica bcrypt de coste 12, rechazo de la clave anterior, revocación de sesiones y conservación de roles y otras cuentas. La prueba de homónimos comprobó que dos empleados con el mismo nombre conservan identificadores, documentos y cuentas distintos.

## Escaneo de secretos

Se utilizó Gitleaks 8.30.1 offline con reglas del proveedor y una regla adicional para contraseñas incrustadas. Se revisaron archivos versionados y nuevos no ignorados, el compilado del frontend, texto extraído de seis PDF y las referencias locales de un historial de 64 commits no superficial. También se compararon en memoria los secretos configurados contra código, compilado, PDF e historial.

- Código actual: tres candidatos revisados y descartados mediante evidencia; eran huellas públicas SHA-256 del código en informes PDF. Cero hallazgos pendientes del escáner en esta instantánea.
- Compilado: cero hallazgos.
- Historial: 15 coincidencias de contraseña; diez apariciones de claves de aplicación publicadas y cinco fixtures históricos aislados. Adicionalmente, la comparación dirigida confirmó la exposición del JWT local.
- `.env`, `backend/.env` y `.env.local`: ignorados, no versionados y sin esos archivos en el historial disponible.
- La URI MongoDB, su contraseña de conexión y el token OIDC configurados no coincidieron con los archivos revisados ni el historial disponible. Esto no comprueba su validez, permisos o exposición fuera de este repositorio.
- Los informes de secretos guardan solamente metadatos permitidos; no incluyen el valor detectado ni la línea que lo contiene. El código no se envió a GitGuardian durante esta auditoría.

La comprobación de fronteras de secretos devuelve estado de fallo mientras exista la coincidencia histórica del JWT. Esto representa un hallazgo real, aunque los tests funcionales pasen.

## ZAP y carga

ZAP 2.17.0 terminó correctamente sobre `127.0.0.1:4174` y `127.0.0.1:8101`, con escaneo activo limitado a tres minutos, dos hilos y MongoDB desechable. No se ejecutó contra producción.

- Sin alertas altas en el alcance probado.
- Alerta media: `style-src unsafe-inline` en la CSP del frontend, también presente en `vercel.json`. Endurecerla requiere revisar los estilos de la interfaz y verificar su presentación; la alerta no demuestra una explotación. [Regla oficial ZAP](https://www.zaproxy.org/docs/alerts/10055-6/).
- Alerta baja: cabecera `X-Powered-By` en páginas del servidor estático temporal de QA, puerto 4174. La API de aplicación ya la deshabilita. No se extrapola este resultado a Vercel. [Regla oficial ZAP](https://www.zaproxy.org/docs/alerts/10037/).
- Alertas informativas de autenticación identificada, agente de usuario, aplicación moderna y comentarios. No equivalen por sí mismas a credenciales filtradas.

K6 ejecutó 14 escenarios de carga y refinamiento. El escenario mixto de **125 peticiones/s durante 60 segundos** completó 7.501 peticiones, p95 de 41,09 ms y cero errores o iteraciones perdidas. Los escenarios de 150 y 200 peticiones/s superaron los umbrales y perdieron iteraciones. Login a 1 y 2 peticiones/s aprobó; a 3 peticiones/s superó el umbral de latencia, sin errores HTTP o de negocio. No se redujo el coste bcrypt.

Estas cifras describen el ordenador local y su MongoDB temporal; no son capacidad de Vercel, Atlas ni cantidad de usuarios simultáneos. El puerto de capacidad deshabilitó solamente límites de peticiones; los límites reales se comprobaron por separado en el puerto 8100. Se detuvo el servidor desechable al terminar.

## Acciones pendientes con autorización

El propietario debe autorizar específicamente la rotación del JWT y decidir si se desactivan o rotan las 120 cuentas demo. Antes de escribir se debe volver a verificar `cluster1.nopuzfk.mongodb.net/proyecto_sena`, listar el alcance exacto sin secretos y confirmar la operación. No se deben modificar roles ni perfiles. Rotar el JWT invalida las sesiones que usen el secreto anterior; deben coordinarse los entornos donde esté configurado.

Después se requiere comprobar revocación y volver a revisar GitGuardian. Reescribir historial, publicar, desplegar o forzar push son operaciones separadas. Esta auditoría no las realizó.

## Evidencia y límites

Evidencia privada e ignorada por Git: `.qa/audit-2026-11-14/` (Vitest, dependencias, metadatos del escáner y revocación) y `.qa/assessment-2026-11-14/` (HTTP, límites, K6 y ZAP). Los originales de QA pueden contener sesiones sintéticas y no deben publicarse. Este documento contiene solamente resultados revisados.

No se auditaron otros repositorios, clones, forks o ramas remotas no descargadas. No se hizo OCR de 43 archivos binarios de imagen/vídeo. No se realizó CI remoto ni una nueva campaña visual con navegador durante estas pruebas. Un análisis automatizado no demuestra ausencia total de vulnerabilidades. No se modificaron datos de Atlas, roles, cuentas, credenciales o configuración de Vercel.
