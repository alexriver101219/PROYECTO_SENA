# Desprendible de nómina de SESHA

En Documentos, el empleado selecciona un mes y descarga un PDF con su identidad autenticada, documento, correo, cargo, área, fecha de ingreso, programación y logo de SESHA. El servidor obtiene el perfil vinculado desde MongoDB; el cliente solo envía el período. Un administrador no tiene una asignación salarial de empleado.

Los valores indicados por el propietario son **netos mensuales**. El comprobante discrimina el devengado antes de descuentos, salud (4 %), pensión (4 %) y total a pagar, manteniendo exactamente el neto acordado. Como el propietario proporcionó netos, el devengado se calcula a partir de estos valores; no se presenta como un básico contractual leído de MongoDB.

Los aportes del empleado se calculan sobre el mismo devengado y se redondean individualmente al peso. Se elige una base entera que satisfaga exactamente `devengado - salud - pensión = neto`, sin ajustes ficticios ni dobles descuentos. Para Laura: devengado **3.478.260**, salud **139.130**, pensión **139.130**, deducciones **278.260** y total a pagar **3.200.000 COP**. Las mismas columnas aparecen en Documentos y en el PDF.

Referencias de los porcentajes del trabajador dependiente: [MinSalud](https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/VP/DOA/RL/cartillas-de-aseguramiento-al-sistema-general-de-seguridad-social-en-salud.pdf), [orientación de la UGPP en la VUE](https://www.vue.gov.co/tramites-y-consultas/orientacion-empleadores-liquidacion-aportes-al-sps). Esta liquidación básica no reemplaza una nómina contractual completa ni una planilla PILA.

| Cargo o grupo | Neto mensual COP | Programación |
| --- | ---: | --- |
| Guarda de seguridad | 2.600.000 | 2x2x2 |
| Supervisor / supervisor de medios tecnológicos | 3.200.000 | 2x2x2 |
| Guarda canino | 2.800.000 | 2x2x2 |
| Escolta de mercancías | 3.200.000 | 2x2x2 |
| Escolta VIP | 3.500.000 | 2x2x2 |
| Coordinador de operaciones | 4.500.000 | 2x2x2 |
| Coordinador de escoltas | 4.600.000 | 2x2x2 |
| Operador de medios tecnológicos | 2.900.000 | 2x2x2 |
| Asistente administrativo, auxiliar de almacén, auxiliar de operaciones, analista de talento humano | 2.000.000 | Lunes a viernes |
| Técnico de medios tecnológicos, auxiliar de tecnología | 2.200.000 | Lunes a viernes |
| Tecnólogo de medios tecnológicos | 2.500.000 | Lunes a viernes |

El ciclo 2x2x2 consiste en dos días diurnos de 12 horas, dos noches de 12 horas y dos días completos de descanso. Es una descripción de la programación por cargo, sin inventar fechas o asistencia. El PDF identifica el alcance: neto mensual completo informado, sin liquidación de recargos, horas extra, auxilios o novedades. No acredita un pago efectuado ni constituye un historial de nómina pagada. La selección del mes utiliza la asignación actual del cargo; no representa salarios históricos congelados. No se realiza prorrateo por días trabajados.

La tabla está en `backend/config/payroll.js`. Los cargos desconocidos requieren revisión administrativa y no reciben un valor por aproximación. El catálogo permite registrar tecnólogos. La consulta agregada previa de producción cubrió los cargos de los 151 empleados existentes.

`GET /api/documentos/nomina?period=YYYY-MM` devuelve la liquidación de la sesión; `GET /api/documentos/nomina/pdf?period=YYYY-MM` entrega el PDF privado. Ambas rutas requieren JWT válido y cuenta/perfil activos. Rechazan parámetros de identidad o importes, meses inválidos o futuros y períodos anteriores al mes de ingreso. No crean registros de pago ni modifican usuarios, documentos de identidad o contraseñas. Las respuestas usan `Cache-Control: no-store`.
