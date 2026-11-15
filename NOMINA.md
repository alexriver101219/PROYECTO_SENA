# Desprendible de nómina de SESHA

En Documentos, el empleado selecciona un mes y una **quincena finalizada** y descarga un PDF con su identidad autenticada, documento, correo, cargo, área, fecha de ingreso, programación y logo de SESHA. El servidor obtiene el perfil vinculado desde MongoDB; el cliente solo envía mes y quincena. Un administrador no tiene una asignación salarial de empleado.

Los valores indicados por el propietario son **netos mensuales**. La asignación mensual aparece en la parte superior; cada quincena conserva la mitad de ese neto. Para Laura corresponden **3.200.000 mensuales y 1.600.000 quincenales**. El devengado se calcula desde el neto de la quincena; no se presenta como un básico contractual leído de MongoDB.

Por selección expresa del propietario, salud y pensión se calculan al **2 % cada una sobre el devengado de la quincena**, con redondeo individual al peso. Se elige una base entera que satisfaga exactamente `devengado - salud - pensión = neto`, sin ajustes ficticios ni dobles descuentos. Para Laura: devengado quincenal **1.666.666**, salud **33.333**, pensión **33.333**, deducciones **66.666** y total a pagar **1.600.000 COP**. Las mismas columnas aparecen en Documentos y en el PDF.

Las tasas configuradas no se presentan como las ordinarias de una nómina legal: el aporte ordinario del trabajador dependiente es del 4 % para salud y 4 % para pensión. Referencias: [MinSalud](https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/VP/DOA/RL/cartillas-de-aseguramiento-al-sistema-general-de-seguridad-social-en-salud.pdf), [orientación de la UGPP en la VUE](https://www.vue.gov.co/tramites-y-consultas/orientacion-empleadores-liquidacion-aportes-al-sps). El PDF identifica que la tasa del 2 % es la solicitada para este comprobante y que no sustituye la liquidación legal de aportes ni una planilla PILA.

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

La primera quincena comprende del día 1 al 15 y la segunda del 16 al último día calendario del mes, incluidos febrero y años bisiestos. Se ofrece por defecto la última quincena cerrada según America/Bogota. El servidor rechaza cortes que aún no terminan; el 15/11/2026 se permite 1–15 de noviembre y se rechaza 16–30 de noviembre. Las quincenas con ingreso del empleado a mitad del período requieren revisión de los días trabajados; no se paga automáticamente una quincena completa.

El ciclo 2x2x2 consiste en dos días diurnos de 12 horas, dos noches de 12 horas y dos días completos de descanso. Es una descripción de la programación por cargo, sin inventar fechas o asistencia. La liquidación no incluye recargos, horas extra, auxilios o novedades. Se utiliza la asignación actual del cargo, sin salarios históricos congelados.

El medio de pago informado por el propietario es **transferencia bancaria a la cuenta del empleado en Bancolombia**. Se muestra en pantalla y PDF, sin números de cuenta, referencias ni fechas de transacción inventadas. No existe integración con el banco ni confirmación automática de que se haya realizado una transferencia. La descarga no mueve dinero ni registra un pago verificado.

La tabla está en `backend/config/payroll.js`. Los cargos desconocidos requieren revisión administrativa y no reciben un valor por aproximación. El catálogo permite registrar tecnólogos. La consulta agregada previa de producción cubrió los cargos de los 151 empleados existentes.

`GET /api/documentos/nomina?period=YYYY-MM&half=1` devuelve la liquidación de la sesión; `GET /api/documentos/nomina/pdf?period=YYYY-MM&half=1` entrega el PDF privado (usar `half=2` para la segunda quincena). El nombre de archivo incluye `Q1` o `Q2`. Ambas rutas requieren JWT válido y cuenta/perfil activos. Rechazan parámetros de identidad o importes, quincenas inválidas o no finalizadas y períodos anteriores al ingreso. No crean registros de pago ni modifican usuarios, documentos de identidad o contraseñas. Las respuestas usan `Cache-Control: no-store`.
