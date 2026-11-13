# Pruebas reproducibles de SESHA

Las herramientas de la campaña local admiten únicamente el entorno desechable `sesha_qa_assessment`.
Nunca leen `backend/.env` ni utilizan Atlas. La excepción explícita es la campaña `run-zap-vercel.cjs` descrita al final, autorizada por el propietario para su dominio publicado.

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
