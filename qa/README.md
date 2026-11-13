# Pruebas reproducibles de SESHA

Las herramientas de la campaña local admiten únicamente el entorno desechable `sesha_qa_assessment`.
Las pruebas locales nunca leen `backend/.env` ni utilizan Atlas. Las excepciones explícitas son la campaña `run-zap-vercel.cjs` y el respaldo privado descritos más abajo, autorizados por el propietario para su proyecto.

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

`python qa/generate_user_manual.py` genera el manual desde las capturas reales privadas de `.qa/handbook-2026-11-13/`, la verificación del respaldo y la comprobación de limpieza de las muestras. Requiere ReportLab, pypdf, Pillow y fuentes Segoe de Windows. Exporta el PDF, imágenes recortadas para excluir la interfaz personal del navegador y un JSON con campos explícitos a `docs/manual/2026-11-13/`. Revisar visualmente todas las páginas y capturas con Poppler antes de publicar.

La campaña de esta entrega revisó Edge de escritorio y emulación adaptable de 400 × 547 píxeles CSS. No se probó un teléfono físico. La constancia se descargó por la interfaz; la carga y descarga de otro PDF se verificaron por API, porque la herramienta no controló el selector nativo. El documento y la solicitud de prueba se eliminaron después; no se guardaron modificaciones en perfiles existentes ni se creó una cuenta adicional por el navegador.
