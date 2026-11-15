# Manejo de credenciales de SESHA

## Remediación posterior autorizada

El propietario autorizó el alcance de producción y se aplicó la cuarentena transaccional de exactamente 120 cuentas demo, con revocación de sesiones. No quedaron cuentas demo activas. Se conservaron cuentas, contraseñas, roles, perfiles y otras cuentas. El respaldo actualizado se restauró y verificó localmente antes de la operación.

La auditoría ampliada detectó 19 empleados adicionales afectados y el propietario autorizó esa segunda cuarentena específica. Se aplicó tras otro respaldo verificado, con pruebas de reversión y revalidación de las claves antes de escribir. En total quedaron desactivadas 139 cuentas; se conservaron las 152 cuentas y perfiles. Las 13 cuentas activas no aceptaron ninguno de los cuatro candidatos históricos comparados. No reactivar una cuenta en cuarentena sin sustituir antes su clave mediante autorización específica.

El JWT local expuesto fue sustituido y Vercel aceptó un secreto de producción independiente como variable sensible. La nueva versión ya está publicada y el JWT firmado con el secreto histórico recibe HTTP 401 en producción y local. La nueva comparación de secretos configurados contra código, compilado, PDF e historial no encontró coincidencias. No se registraron valores privados. Las claves históricas de admin, Carlos y Laura siguen sin coincidir con sus hashes actuales.

Se cerró el registro público en producción y se añadió el alta administrativa transaccional con datos laborales verificados y contraseña inicial oculta. Se endurecieron CSP y configuración de conexión; ZAP local repetido solo dejó alertas informativas. Consultar [arquitectura y operación](ARQUITECTURA_Y_PRODUCCION.md). Los hallazgos del apartado siguiente describen el diagnóstico anterior a estas correcciones.

## Diagnóstico previo del 14/11/2026, sustituido por la remediación anterior

**La seguridad no está cerrada.** La auditoría ampliada confirmó dos accesos pendientes de remediación:

- El `JWT_SECRET` configurado en el entorno local coincide exactamente con un literal de pruebas presente en el historial de Git. Debe rotarse. No se ha comprobado el valor configurado en Vercel; si coincide, también requiere rotación allí. Esta operación invalida las sesiones firmadas con el secreto anterior y necesita autorización específica.
- En `cluster1.nopuzfk.mongodb.net/proyecto_sena`, las 120 cuentas demo siguen activas y sus hashes aceptan una contraseña publicada históricamente. La comprobación utilizó lecturas y comparaciones bcrypt en memoria, sin peticiones de login ni escrituras. Su desactivación o rotación y revocación de sesiones requieren autorización específica para estas 120 cuentas.

Las claves históricas de admin, Carlos y Laura ya no coinciden con sus hashes actuales. No se consultaron ni registraron sus nuevas claves. Ninguna cuenta, rol o dato de Atlas fue modificado durante la auditoría.

Con Node 24.22.3 se aprobaron 48 pruebas de backend, 19 de frontend, 47 comprobaciones HTTP y los dos límites de peticiones. Lint, build, dependencias instaladas y verificación de publicación correctos; npm audit informó cero vulnerabilidades conocidas. La conexión real de solo lectura a Atlas también funcionó con Node 24.

El escaneo offline del código actual, compilado y texto de seis PDF no dejó secretos detectados sin resolver; tres candidatos en PDF eran huellas públicas del código. El historial conserva contraseñas publicadas y la coincidencia del secreto JWT. `.env`, `backend/.env` y `.env.local` están ignorados y no versionados. ZAP local terminó con una alerta media de CSP y una baja del servidor temporal, sin alertas altas en el alcance probado.

Consultar [el informe completo](VALIDACION_SEGURIDAD_2026-11-14.md) para alcance, evidencias, límites de carga y pendientes. Los apartados históricos al final describen comprobaciones anteriores; este estado los sustituye donde difieran.

Las claves antes incrustadas en `seed.js`, `add-demo-employees.js`, documentación y herramientas QA deben considerarse expuestas. Quitarlas de la versión actual no las elimina del historial de Git ni revoca los accesos existentes. No reutilizarlas. No pegar claves en chat, comandos, capturas ni incidencias.

## Inspección y autorización

`npm run passwords:inspect` carga `backend/.env` (sin sobreescribir variables ya presentes), abre una conexión y solo realiza ping y consulta de las dos cuentas. Muestra host, base y colección, nunca la URI, usuario de Atlas, claves ni hashes. No crea índices, colecciones, cuentas ni perfiles. Requiere una base explícita en la URI y TLS válido en Atlas. Las variables del entorno tienen prioridad: comprobar siempre el destino que devuelve la inspección.

Antes de escribir, verificar el destino mostrado y obtener autorización específica del propietario para cambiar únicamente las claves de `admin@sesha.com` y `carlos.mendoza@sesha.com` y revocar sus sesiones. Si no se ha recibido esa autorización, detenerse en la inspección.

Después de autorizar, en una terminal privada local:

```text
npm run passwords:rotate -- --expected-host <HOST_VERIFICADO> --expected-db <BASE_VERIFICADA>
```

El script vuelve a comprobar el destino y las dos cuentas. Solicita escribir `AUTORIZO <HOST_VERIFICADO>/<BASE_VERIFICADA>` y después introducir y confirmar cada nueva clave con entrada oculta. No admite contraseñas como argumentos, por tubería o desde archivos. Usar claves diferentes, al menos 12 caracteres y como máximo 72 bytes UTF-8. Ctrl+C cancela la entrada y restaura el terminal. No usar una terminal compartida ni herramientas que capturen las pulsaciones.

Antes de capturar las claves muestra sus requisitos y explica que no aparecen caracteres ni asteriscos. Una clave inválida, repetida entre cuentas o con confirmación distinta vuelve a solicitarse sin iniciar la transacción. Los mensajes de validación y cancelación son textos fijos y nunca incorporan el valor introducido. Los detalles de errores inesperados del driver siguen ocultos.

Se calculan hashes bcrypt con coste 12 y sales independientes. Una transacción actualiza exclusivamente `password` y `sessionVersion` en las dos cuentas existentes de `empleados`. El incremento revoca sus JWT anteriores. No modifica roles, estado, perfiles u otras cuentas. Si una cuenta falta, está duplicada, no se confirma la clave o la transacción falla, no se confirma ninguna actualización. Requiere un replica set con transacciones, como Atlas. Si se interrumpe la conexión durante la confirmación, el resultado puede ser incierto: verificar el acceso privadamente antes de reintentar. Los errores del driver se omiten para impedir filtraciones. No se ejecuta como parte del build, despliegue o arranque.

## Cambio desde la pantalla de inicio de sesión

El botón **Cambiar contraseña**, debajo de **Entrar al sistema**, abre un formulario con correo, contraseña actual, nueva contraseña y confirmación. Los tres campos de contraseña se muestran enmascarados. La nueva clave requiere al menos 12 caracteres y como máximo 72 bytes UTF-8, sin controles, y debe diferir de la actual. El formulario no guarda claves en almacenamiento del navegador y vacía sus campos secretos después de recibir una respuesta del servidor.

`POST /api/auth/change-password` valida los campos y verifica la contraseña actual con bcrypt. No basta conocer un correo ni presentar una cookie o un JWT. El correo inexistente, la cuenta inactiva y la clave incorrecta reciben el mismo error. La ruta comparte el límite de 20 intentos de autenticación por ventana de 15 minutos y la protección de origen de la aplicación. Como el login, verifica credenciales explícitas y no usa una cookie para autorizar la operación.

Una única actualización atómica guarda el hash bcrypt con coste 12 e incrementa `sessionVersion`; no crea cuentas, cambia roles ni modifica perfiles. El filtro incluye el hash anterior y la cuenta activa para evitar sobrescribir cambios concurrentes. Después borra la cookie de sesión y vuelve al login, sin iniciar sesión automáticamente. Esta opción requiere conocer la contraseña actual; no es una recuperación por correo. La ruta solo queda disponible en los entornos donde se publique o ejecute esta versión de la API.

Verificación local de esta opción: 7 pruebas nuevas de API y 4 de interfaz aprobadas; 48 pruebas del backend y 19 del frontend en total. Lint y compilación correctos. Una comprobación HTTP adicional a través del proxy de Vite y MongoDB temporal confirmó el cambio de las dos cuentas ficticias, rechazo de claves anteriores, revocación de sesiones y conservación de roles y cantidad de cuentas. El navegador de pruebas no estuvo disponible; no se completó una revisión visual real. No se modificó Atlas ni se publicó esta versión.

## Semillas y QA

La semilla requiere `SEED_ADMIN_PASSWORD`, `SEED_CARLOS_PASSWORD` y `SEED_LAURA_PASSWORD` antes de conectar. La carga de empleados demo requiere `DEMO_EMPLOYEES_PASSWORD` para `--apply`. No tienen valores predeterminados, no imprimen claves y siguen usando bcrypt con coste 12. Solo crean cuentas cuando se ejecuta la carga explícitamente; no usar estas cargas para cambiar claves existentes. Definir los valores mediante un gestor de secretos o un `.env` privado ignorado y con permisos de lectura restringidos. Estas variables no necesitan publicarse en el frontend ni configurarse en Vercel para el funcionamiento normal.

Las pruebas automáticas usan credenciales ficticias y MongoDB temporal aislado; no leen `backend/.env`. Las herramientas QA contra el sitio publicado requieren `QA_ADMIN_PASSWORD` y, donde corresponda, `QA_CARLOS_PASSWORD`, sin valores predeterminados. Ejecutarlas exige autorización propia para ese destino y alcance.

## GitGuardian e historial

Los archivos `.env*` están ignorados salvo plantillas `.env.example` y `.env.*.example`, que deben permanecer sin valores reales. `git check-ignore -v .env backend/.env .env.local` verifica las exclusiones; `git ls-files -- .env backend/.env .env.local` debe quedar vacío. No usar `git add -f` para secretos.

Después de rotar los accesos afectados, revisar la alerta concreta de GitGuardian (tipo de secreto, archivo y commit). Una contraseña de usuario SESHA es distinta de la contraseña del usuario de base de datos de Atlas y del secreto JWT. Si esos otros secretos también se expusieron, requieren rotaciones separadas y actualización coordinada de los entornos autorizados. No se han cambiado aquí.

Reescribir el historial o forzar un push requiere una operación coordinada y autorización independiente; no se hace automáticamente. Revisar ramas, etiquetas, forks, clones y artefactos históricos que pudieran conservar claves. No cerrar una alerta únicamente por haber borrado el literal del código: verificar primero su revocación y volver a escanear el repositorio con GitGuardian.

Referencias: [conexiones Mongoose](https://mongoosejs.com/docs/connections.html), [formato MongoDB](https://www.mongodb.com/docs/manual/reference/connection-string/), [límite de bcryptjs](https://www.npmjs.com/package/bcryptjs).

## Resultado de la revisión del 14 de noviembre de 2026

- Atlas verificado mediante ping y consulta con proyección de identificadores/correos: host `cluster1.nopuzfk.mongodb.net`, base `proyecto_sena`, colección `empleados`; existe exactamente una cuenta por cada correo solicitado. No se realizaron escrituras ni se consultaron hashes en Atlas.
- `.env`, `backend/.env` y `.env.local` están ignorados y no están versionados; no se encontraron esos tres archivos en el historial disponible. Esto no descarta secretos en otras rutas, ramas remotas no descargadas o artefactos.
- El rastreo de 112 archivos de texto versionados no encontró literales exactos de las claves retiradas ni candidatos adicionales de autenticación MongoDB incrustada. Es una comprobación dirigida, no un nuevo análisis de GitGuardian ni un escaneo exhaustivo de binarios/historial.
- Backend: 48 pruebas aprobadas, incluidas 15 de rotación por terminal y 7 de cambio por API. Frontend: 19 pruebas aprobadas, incluidas 4 del nuevo formulario. Lint de ambos espacios y compilación del frontend correctos. Las pruebas y el build se ejecutaron con Node.js 26.12.0 disponible localmente; el proyecto y CI declaran Node.js 24, que no estaba instalado. No se ejecutó CI remoto.
- Las pruebas usan exclusivamente MongoDB temporal y datos ficticios. Cubren entrada oculta y cancelación, límites UTF-8/bcrypt, ausencia de autorización, destino distinto, cuentas ausentes/duplicadas, rollback si falla la segunda actualización, conservación de campos y revocación de JWT.
- El propietario autorizó la rotación de admin y Carlos y posteriormente informó haber cambiado también la clave de Laura desde el formulario local. Una consulta de solo lectura sobre `proyecto_sena.empleados` confirmó que las tres cuentas son únicas y están activas, con roles `admin`, `employee` y `employee`, respectivamente. Sus versiones de sesión actuales son 3, 2 y 2; los JWT con versiones anteriores son rechazados por la autenticación. La consulta no leyó claves ni hashes y no comprobó el inicio de sesión con las nuevas claves, que permanecen en poder del propietario.
- Node.js 26 presentó un error de resolución DNS en la conexión real; la API local se inició con Node.js 23.3.0, sin creación automática de índices ni colecciones. No se ejecutaron semillas, migraciones, pruebas de acceso al sitio publicado, despliegues ni reescrituras de historial. Sigue pendiente volver a escanear con GitGuardian y revisar separadamente cualquier cuenta demo creada con credenciales compartidas expuestas.
