# Pruebas reproducibles de SESHA

## Publicación actualizada de los cuatro informes

La campaña del 14/11/2026 conserva `docs/pruebas/2026-11-13/` y publica una edición independiente en `docs/pruebas/2026-11-14/`. La generación usa listas explícitas de campos y no copia informes crudos, cookies o cuerpos privados.

1. Definir `QA_OUTPUT=.qa/reports-2026-11-14`. Conservar allí los JSON aprobados de Vitest de la misma versión del código. Iniciar `node qa/isolated-server.cjs`; su carga ficticia usa modo test y las API de medición vuelven a modo producción. No se carga el entorno de Atlas.
2. Ejecutar HTTP y límites, después `run-k6.cjs` y `refine-k6.cjs`, secuencialmente. No ejecutar ZAP o generar PDF mientras k6 mide. Los escalones fuera de umbral se conservan como fallidos.
3. Ejecutar `prepare-zap.cjs` y `run-zap.cjs` en el entorno aislado. Con el mismo `QA_OUTPUT`, actualizar `check-production-headers.cjs` y `audit-dependencies.cjs` (este último usa `SECRET_AUDIT_OUTPUT` para la carpeta de salida).
4. Para ZAP autenticado en Vercel, ejecutar `node qa/private-zap-login.cjs` y abrir `http://127.0.0.1:5177`. El propietario introduce las claves actuales en campos enmascarados. El servidor solo escucha en loopback, valida Host, origen y nonce, limita intentos y envía las credenciales únicamente al login HTTPS fijo de SESHA. Las claves permanecen en memoria; las dos sesiones se guardan temporalmente en una carpeta protegida y excluida de Git. Tras confirmar, el formulario deja de aceptar claves y permite cerrar la pestaña.
5. Definir `ZAP_VERCEL_OUTPUT=.qa/zap-vercel-2026-11-14` y `QA_ZAP_SESSION_FILE=.qa/zap-vercel-2026-11-14/sessions-private.json`. Conservar un `deployment.json` privado con ID, commit, URL, estado y fecha de verificación del destino. Ejecutar `run-zap-vercel.cjs` y `review-zap-vercel.cjs`. Se reutilizan las sesiones sin volver a introducir o guardar contraseñas; después se elimina el archivo de sesiones. No se desactivan protecciones ni se realizan escrituras de negocio o carga en producción.
6. `node qa/export-current-results.cjs` genera los dos JSON públicos revisados. `python qa/generate_current_reports.py` genera los cuatro PDF en `output/pdf/` y copias idénticas en la nueva carpeta pública. `node qa/build-report-index.cjs` actualiza Pages a partir de esos resultados y sus números de páginas reales.
7. Renderizar y revisar todas las páginas con Poppler, ejecutar `python qa/verify-publication.py` y el escaneo de secretos, integrar mediante CI y verificar la publicación remota y cada descarga. `REPORT_DATE` permite identificar otra edición; las carpetas de entrada, autorización del destino y procedencia de los datos deben ajustarse conjuntamente.

Las comprobaciones de publicación realizadas tras el despliegue se presentan separadas de las pruebas locales. Las evidencias de Vitest conservadas declaran su hora original; HTTP, k6 y ZAP se repiten y no se mezclan resultados de versiones distintas sin explicarlo.

## Auditoría local del 14/11/2026

Resultado inicial: [validación funcional y de seguridad](../VALIDACION_SEGURIDAD_2026-11-14.md). Ese diagnóstico precede a la remediación de JWT y cuentas demo descrita a continuación; las pruebas aprobadas no sustituyen la revisión de los hallazgos de seguridad.

Actualización posterior: [remediación y arquitectura de producción](../ARQUITECTURA_Y_PRODUCCION.md). El propietario autorizó la cuarentena de las demos y la rotación del JWT. La campaña posterior usa `QA_OUTPUT=.qa/remediation-2026-11-14`; el nuevo flujo sustituye el registro público de producción por alta administrativa. `backend/scripts/quarantine-demo-accounts.js` es una herramienta separada, con vista previa predeterminada y destino fijo; `--apply --approved-disable-demo` solo se usa después de autorización específica. No se ejecuta en CI, build o arranque.

La revisión ampliada también encontró 19 empleados afectados, desactivados tras una autorización adicional. `backend/scripts/quarantine-additional-accounts.js` valida el manifiesto privado de exactamente 19 identificadores, excluye admin/Carlos/Laura y revalida las credenciales en una transacción. `--apply --approved-disable-additional` exige ese alcance autorizado; sin aplicar solo inspecciona. El manifiesto no debe subirse al repositorio. `qa/audit-exposed-credentials.cjs --atlas-read-only` compara ahora todas las cuentas activas con los candidatos históricos detectados y solo conserva conteos, booleanos y un listado privado para revisión. No ejecuta login ni escribe en Atlas.

`node qa/verify-production-release.cjs` verifica exclusivamente `https://sesha-app.vercel.app`: lecturas públicas, peticiones inválidas sin escrituras de negocio y una lectura de Atlas para comprobar el rechazo del JWT retirado. No usa claves del propietario. Requiere autorización para el destino; las peticiones consumen los contadores normales de seguridad. El informe privado omite cuerpos, cookies y tokens.

La campaña nueva conserva la evidencia anterior y usa `QA_OUTPUT`. Con Node 24 en PATH y desde la raíz, en PowerShell:

```powershell
$env:QA_OUTPUT = '.qa/assessment-2026-11-14'
npm test
npm run lint
npm run build
node qa/isolated-server.cjs
```

En otra terminal, definir el mismo `QA_OUTPUT` y ejecutar secuencialmente `node qa/functional-http.cjs`, `node qa/check-protection-limits.cjs`, `node qa/run-k6.cjs`, `node qa/refine-k6.cjs`, `node qa/prepare-zap.cjs` y `node qa/run-zap.cjs`. Detener el servidor temporal con Ctrl+C al terminar. No reutilizar una campaña para comparar resultados distintos. `K6_BINARY` permite elegir un ejecutable portable.

Herramientas nuevas de auditoría:

- `node qa/audit-dependencies.cjs`: npm audit; conserva solamente conteos y avisos, sin salida cruda de errores.
- `node qa/scan-secrets.cjs`: Gitleaks local, historial completo, archivos actuales, compilado y extracción de PDF. Usa `.qa/tools/gitleaks/gitleaks.exe` y `.qa/pdf-venv/Scripts/python.exe`; admite `GITLEAKS_PATH`, `AUDIT_PYTHON` y `SECRET_AUDIT_OUTPUT`. Requiere pypdf. `--current-only` reutiliza un informe histórico existente y vuelve a analizar archivos actuales y compilado. No utilizarlo como sustituto de un nuevo escaneo del historial si este cambia.
- `node qa/check-secret-boundaries.cjs`: lee el entorno privado en memoria y busca coincidencias sin mostrar valores; comprueba exclusiones de Git. No escribe en Atlas. Una coincidencia histórica produce estado de fallo.
- `node qa/audit-exposed-credentials.cjs --atlas-read-only`: **excepción explícita de acceso a Atlas**, separada de los tests automáticos. Verifica host/base fijos, lee hashes y compara bcrypt en memoria con referencias históricas; únicamente conserva booleanos y conteos. No envía logins ni escribe. No registra claves o hashes. No ejecutarla como parte del build o arranque. Requiere un escaneo histórico previo y conectividad autorizada.

Node 24.22.3 y Gitleaks 8.30.1 se usaron como herramientas portables verificadas; no se cambió la instalación global. Los escaneos no envían código a GitGuardian. Las carpetas `.qa/` siguen siendo privadas y están ignoradas.

Las herramientas de la campaña local admiten únicamente el entorno desechable `sesha_qa_assessment`.
Los tests funcionales locales nunca leen `backend/.env` ni utilizan Atlas. Las auditorías de secretos indicadas arriba, la campaña `run-zap-vercel.cjs` y el respaldo privado descritos más abajo son operaciones separadas con acceso privado o externo; requieren el alcance autorizado correspondiente.

1. Usar Node 24 y compilar el frontend: `npm run build`.
2. Iniciar `node qa/isolated-server.cjs` desde la raíz.
3. En otra terminal: `node qa/functional-http.cjs` y `node qa/check-protection-limits.cjs`.
4. Ejecutar `node qa/run-k6.cjs` y después `node qa/refine-k6.cjs`. Requiere k6 en `C:\Program Files\k6\k6.exe`. La escalera se detiene ante el primer fallo; la confirmación usa 60 segundos.
5. Ejecutar `node qa/prepare-zap.cjs` y `node qa/run-zap.cjs`. Requiere Java y ZAP 2.17.0 en la ruta configurada en el script. Revisar las alertas antes de publicar.
6. `node qa/check-production-headers.cjs` consulta únicamente cuatro rutas públicas, sin escaneo activo ni carga.
7. Conservar también los resultados JSON de Vitest y npm audit en el directorio privado esperado por `prepare-public-results.cjs`; este último exporta una lista explícita de campos publicables. Revisarla antes de generar `python qa/generate_reports.py` (requiere ReportLab y pypdf; fuentes Segoe de Windows).
8. Renderizar los tres PDF con Poppler y revisar todas sus páginas antes de copiarlos/publicarlos. `generate_reports.py` guarda el mismo contenido en `output/pdf/` y `docs/pruebas/2026-11-13/`.

Las rutas y la fecha identifican esta campaña concreta. Para una campaña nueva, adaptar conjuntamente la carpeta de entrada de los scripts y la salida pública; no mezclar ejecuciones. Detener el servidor aislado con Ctrl+C al terminar.

Los registros completos, sesiones y tokens se guardan en `.qa/assessment-2026-11-13/`, ignorado por Git y Vercel.
Solo los resultados numéricos, informes revisados y PDF finales de `docs/pruebas/` son publicables.
El puerto 8100 conserva los límites de peticiones; el 8101 los desactiva exclusivamente para medir capacidad de la aplicación, manteniendo autenticación y permisos.
El frontend compilado se sirve en 4174 y dirige su API a 8101.
Los resultados locales no representan la capacidad de Vercel o MongoDB Atlas.

## Campaña adicional sobre Vercel

`node qa/run-zap-vercel.cjs` tiene el destino fijo `https://sesha-app.vercel.app`. Solo debe ejecutarse con autorización del propietario. Obtiene una sesión académica, solicita 14 recursos por GET y aplica exclusivamente las reglas 40012 y 40033 a `limit` y `page` de `/api/empleados`. Un hilo, pausa de 1.500 ms y máximo activo de 3 minutos; límites públicos conservados. No hay spider ni operaciones de escritura durante el escaneo. El login previo es el único POST emitido por el orquestador.

Requiere el complemento oficial `ascanrulesBeta` y sus dependencias en `.qa/zap-vercel-tools/plugin/`, instalado mediante el CLI oficial de ZAP con `-addoninstall ascanrulesBeta` y ese perfil privado (`-dir`). Los archivos se copian al perfil temporal de cada ejecución; no se modifica la instalación global.

Después, `node qa/review-zap-vercel.cjs` contrasta CORS y caché con lecturas de dos cuentas académicas (dos logins adicionales), un origen ajeno y acceso anónimo. Solo se conserva estado HTTP, cabeceras seleccionadas y comprobaciones booleanas. `node qa/prepare-vercel-results.cjs` exporta la lista de campos revisada y confirma en el log que ambas reglas finalizaron. Esta campaña registra el despliegue concreto en el exportador; actualizar y verificar esa referencia para otra ejecución.

`python qa/generate_vercel_report.py` crea el PDF adicional, que requiere la misma revisión visual con Poppler. Los originales del escáner permanecen privados en `.qa/zap-vercel-2026-11-13/`; no subirlos a Pages. No usar este procedimiento para medir carga o capacidad de Vercel.

## Respaldo completo y restauración local

`node qa/backup-and-verify.cjs` lee `MONGO_URI` exclusivamente desde el archivo privado del backend y exige la base `proyecto_sena`. Exporta todas sus colecciones con `mongodump`, incluyendo documentos, opciones e índices. Utiliza las herramientas oficiales portátiles 100.20.1 instaladas en `.qa/tools/mongodb-tools/mongodb-database-tools-windows-x86_64-100.20.1/bin/`.

El script compara manifiestos del origen antes y después del dump y restaura el archivo con `mongorestore` únicamente en un replica set temporal ligado a `127.0.0.1`. Se comprueban conteos, contenido, opciones e índices. El monitor TTL se deshabilita solo en esa instancia temporal para evitar expiraciones durante la comparación. Nunca se restaura ni se elimina información en Atlas. Al finalizar se apaga y retira la instancia local.

El archivo y los registros se conservan en `.qa/backups/<fecha>/`; `.qa/latest-backup.json` identifica la última ejecución. La configuración temporal que contiene la URI se elimina al terminar. No publicar el archive, BSON, registros, hashes de contraseñas ni sesiones. Este respaldo no incluye usuarios de Atlas, claves o configuración de red; tampoco es una captura global con oplog. Conservar otra copia privada fuera del proyecto.

## Manual ilustrado

La edición vigente del **15/11/2026** se genera con `python qa/generate_documentation_update.py`: manual de 12 páginas e informe técnico de 45 (9 vigentes + 36 históricas rotuladas). Utiliza exclusivamente campos seleccionados de los informes privados de verificación para producir `docs/actualizaciones/2026-11-15/verificacion.json`; no lee contraseñas ni sesiones. Requiere los informes locales de las operaciones y las capturas vacías del acceso de la edición anterior. Las salidas estables están en `output/pdf/`, con copias idénticas bajo `docs/manual/2026-11-15/` y `docs/informes/2026-11-15/`. `python qa/render_documentation_update.py` renderiza todas las páginas a `.qa/documentation-2026-11-15/render/`; revisar sus hojas y páginas completas. Ejecutar después `node qa/build-report-index.cjs` y `python qa/verify-publication.py`. Se mantiene la campaña de pruebas del 14/11 y no se vuelven a presentar sus métricas como ensayos de las rutas nuevas.

`python qa/generate_user_manual.py` genera la revisión de 11 páginas del 14/11/2026. Conserva las capturas privadas de `.qa/handbook-2026-11-13/` y la evidencia histórica del respaldo y limpieza de muestras. Añade `.qa/handbook-2026-11-14/01-ingreso.jpg` (1280 × 752) y `02-cambio-clave.jpg` (1280 × 800): capturas reales de Edge InPrivate sobre el entorno local aislado, con campos vacíos. Requiere ReportLab, pypdf, Pillow y fuentes Segoe de Windows. Exporta el PDF a `output/pdf/` y una copia idéntica, 15 capturas recortadas y el JSON de evidencia a `docs/manual/2026-11-14/`. Conserva la edición anterior en su carpeta histórica. Revisar visualmente todas las páginas renderizadas con Poppler y ejecutar `python qa/verify-publication.py` antes de publicar. La evidencia identifica la revisión local como pendiente de publicación.

La campaña de esta entrega revisó Edge de escritorio y emulación adaptable de 400 × 547 píxeles CSS. No se probó un teléfono físico. La constancia se descargó por la interfaz; la carga y descarga de otro PDF se verificaron por API, porque la herramienta no controló el selector nativo. El documento y la solicitud de prueba se eliminaron después; no se guardaron modificaciones en perfiles existentes ni se creó una cuenta adicional por el navegador.
