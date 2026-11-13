"""Genera tres informes desde resultados sanitizados; no lee sesiones ni .env."""
import json
import shutil
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.graphics.shapes import Drawing, String
from reportlab.graphics.charts.barcharts import VerticalBarChart
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'docs/pruebas/2026-11-13'
OUT = ROOT / 'output/pdf'
OUT.mkdir(parents=True, exist_ok=True)
D = json.loads((PUBLIC / 'resultados.json').read_text(encoding='utf-8'))
pdfmetrics.registerFont(TTFont('Segoe', 'C:/Windows/Fonts/segoeui.ttf'))
pdfmetrics.registerFont(TTFont('SegoeBold', 'C:/Windows/Fonts/segoeuib.ttf'))
pdfmetrics.registerFontFamily('Segoe', normal='Segoe', bold='SegoeBold')
NAVY, TEAL, INK = [colors.HexColor(c) for c in ['#142c45', '#087f80', '#26374a']]
ST = getSampleStyleSheet()
for key in ['Normal', 'BodyText']:
    ST[key].fontName = 'Segoe'; ST[key].fontSize = 9.3; ST[key].leading = 14; ST[key].textColor = INK
ST.add(ParagraphStyle(name='TitleS', fontName='SegoeBold', fontSize=26, leading=31, textColor=NAVY, spaceAfter=16))
ST.add(ParagraphStyle(name='SubS', fontName='SegoeBold', fontSize=14, leading=18, textColor=TEAL, spaceBefore=14, spaceAfter=8))
ST.add(ParagraphStyle(name='CellS', fontName='Segoe', fontSize=8.2, leading=11, textColor=INK))
ST.add(ParagraphStyle(name='SmallS', fontName='Segoe', fontSize=8, leading=12, textColor=INK))
ST.add(ParagraphStyle(name='MetricS', fontName='SegoeBold', fontSize=19, leading=25, textColor=TEAL))
ST.add(ParagraphStyle(name='HeadCellS', parent=ST['CellS'], fontName='SegoeBold', textColor=colors.white))
WIDTH = A4[0] - 36 * mm

def p(text, style='BodyText'):
    return Paragraph(text, ST[style])

def table(rows, widths=None):
    cells = [[p(escape(str(c)), 'HeadCellS' if i == 0 else 'CellS') for c in row] for i, row in enumerate(rows)]
    t = Table(cells, colWidths=widths, repeatRows=1, hAlign='LEFT')
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY), ('TEXTCOLOR',(0,0),(-1,0),colors.white),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#f1f6f9'), colors.white]),
        ('VALIGN',(0,0),(-1,-1),'TOP'), ('LEFTPADDING',(0,0),(-1,-1),7),
        ('RIGHTPADDING',(0,0),(-1,-1),7), ('TOPPADDING',(0,0),(-1,-1),6),
        ('BOTTOMPADDING',(0,0),(-1,-1),6), ('LINEBELOW',(0,0),(-1,0),1,TEAL),
    ]))
    return t

def chrome(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY); canvas.rect(0,A4[1]-16*mm,A4[0],16*mm,fill=1,stroke=0)
    canvas.setFont('SegoeBold',9); canvas.setFillColor(colors.white)
    canvas.drawString(18*mm,A4[1]-10*mm,'SESHA APP  /  PROYECTO SENA')
    canvas.setStrokeColor(TEAL); canvas.line(18*mm,16*mm,A4[0]-18*mm,16*mm)
    canvas.setFont('Segoe',8); canvas.setFillColor(INK)
    canvas.drawString(18*mm,11*mm,'Evaluación técnica · 13 noviembre 2026 · America/Bogota')
    canvas.drawRightString(A4[0]-18*mm,11*mm,str(doc.page))
    canvas.restoreState()

def intro(title, subtitle):
    return [Spacer(1,10*mm), p(title,'TitleS'), p(subtitle), Spacer(1,5*mm)]

def h(text): return p(text,'SubS')
def note(text): return p(text,'SmallS')
def num(x): return f'{x:.1f}'

def provenance():
    return [h('Trazabilidad y lectura de los resultados'),
        p('Ejecución local del 13/11/2026. Base Git: <b>'+D['source']['baseCommit'][:12]+'</b>, con los ajustes locales del despliegue. Huella SHA-256 del código de aplicación, sin secretos ni informes:'),
        note(D['source']['applicationSha256'][:32]+'<br/>'+D['source']['applicationSha256'][32:]),
        p('Los datos sintéticos y la base temporal se aislaron de MongoDB Atlas. No se ejecutaron pruebas activas ni de carga contra producción. El contraste publicado se limitó a cuatro solicitudes de lectura: inicio, login, salud y disponibilidad.'),
        p('Los resultados estructurados se incluyen en <b>resultados.json</b>. Los registros internos, credenciales, URI y sesiones del escáner no forman parte de esta publicación.')]

def build(name, story):
    target = OUT / name
    SimpleDocTemplate(str(target), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=24*mm,
        bottomMargin=23*mm, title=name.replace('-',' ').removesuffix('.pdf'), author='SESHA APP - Proyecto SENA').build(story,onFirstPage=chrome,onLaterPages=chrome)
    reader = PdfReader(target)
    text = '\n'.join(page.extract_text() or '' for page in reader.pages)
    assert all(len(page.extract_text() or '') > 100 for page in reader.pages), 'Página vacía'
    assert 'mongodb+srv://' not in text and 'Bearer eyJ' not in text
    shutil.copy2(target, PUBLIC / name)
    print(json.dumps({'pdf':name,'pages':len(reader.pages),'bytes':target.stat().st_size}))

F = D['functional']
s = intro('Pruebas funcionales', 'Informe de resultados y evidencias automatizadas de SESHA APP.')
s += [p('77 / 77 aprobadas','MetricS'), p('22 pruebas de backend, 15 de frontend y 40 verificaciones HTTP con persistencia real en MongoDB temporal. Ninguna falló en la ejecución final.'),
    h('Alcance de la validación'), p('Se verificaron autenticación por cookie, CSRF, permisos de administrador y empleado, perfiles, solicitudes, documentos, certificados PDF y persistencia. El frontend se validó mediante pruebas de componentes y entrega de la compilación; no se realizó interacción visual completa con un navegador.'),
    table([['Capa','Aprobadas','Fallidas'],['Backend / Vitest',22,0],['Frontend / Vitest',15,0],['HTTP + MongoDB',40,0]], [WIDTH*.6,WIDTH*.2,WIDTH*.2]),
    h('Compilación y calidad'), p('La compilación de Vite y los análisis ESLint de backend y frontend finalizaron correctamente con Node 24.22.3. No se recopiló una métrica de cobertura de código; 77 casos aprobados no equivalen a cobertura total.'),
    h('Límites comprobados'), table([['Control','Resultado observado'],['Carga de PDF','3.145.728 bytes aceptados; un byte adicional rechazado con HTTP 400.'],['Cuerpo JSON','Un cuerpo mayor que 16 KiB se rechazó con HTTP 413.'],['API por IP','120 solicitudes permitidas en 60 s; la número 121 recibió HTTP 429.'],['Autenticación por IP','20 intentos en 900 s; el número 21 recibió HTTP 429.']], [WIDTH*.28,WIDTH*.72]),
    note('Los contadores de protección usan MongoDB y se probaron por separado de la carga. La inactivación de un perfil conserva su información; no existe una ruta DELETE de empleados.')]
http = [t for t in F['tests'] if t['suite']=='HTTP']
for idx in range(0,len(http),20):
    s += [PageBreak(),h('Casos HTTP y persistencia - '+str(idx//20+1)), p('Entorno aislado, API local, datos exclusivamente sintéticos. Cada resultado corresponde a la ejecución final.'),
        table([['Caso verificado','Resultado','ms']]+[[t['name'],'Aprobado',num(t['durationMs'])] for t in http[idx:idx+20]], [WIDTH*.75,WIDTH*.15,WIDTH*.1])]
for suite in ['Backend','Frontend']:
    subset=[t for t in F['tests'] if t['suite']==suite]
    s += [PageBreak(),h('Casos automatizados de '+suite.lower()), table([['Caso','Resultado']]+[[t['name'],'Aprobado'] for t in subset],[WIDTH*.84,WIDTH*.16])]
s += [PageBreak(),h('Qué demuestra esta ejecución'),p('La aplicación pudo completar los flujos descritos con control de acceso y almacenamiento temporal real. Las pruebas comprobaron que un empleado no podía consultar ni modificar recursos de otro, que el administrador conservaba las operaciones permitidas y que los archivos descargados mantenían sus bytes.'),
    h('Límites y siguientes comprobaciones'),p('Quedan fuera: evaluación manual de accesibilidad, compatibilidad visual entre navegadores, envío de correo externo, restauración de copias y uso prolongado con datos reales. Tampoco se hizo una carga masiva de documentos en Atlas ni se estimó su capacidad de almacenamiento. Antes de operar con más usuarios, conviene validar los recorridos visuales y medir en un entorno de preproducción equivalente al publicado.')]+provenance()
build('informe-pruebas-funcionales.pdf',s)

P = D['performance']
s = intro('Rendimiento con k6','Capacidad observada en el equipo de pruebas. Estos resultados no certifican la capacidad de Vercel ni de MongoDB Atlas.')
s += [p('50 solicitudes/s durante 60 s','MetricS'),p('Se completaron 3.000 solicitudes: cero errores y cero iteraciones descartadas. Latencia p95: <b>33,4 ms</b>; p99: <b>52,9 ms</b>; p95 de certificados PDF: <b>69,0 ms</b>.'),
    h('Hasta dónde se comprobó'), table([['Escenario','Resultado y alcance'],['Carga mixta sostenida','50 solicitudes/s durante 60 s: aprobada. No se hizo una prueba de resistencia de horas.'],['Pico de corta duración','125 solicitudes/s durante 25 s: aprobado. Al extenderlo a 60 s no mantuvo la carga.'],['100 solicitudes/s / 60 s','Falló el criterio de cero descartes: 16 iteraciones no iniciadas.'],['125 solicitudes/s / 60 s','3.154 iteraciones descartadas y 10 errores HTTP; carga lograda de 78,6 solicitudes/s.'],['Inicio de sesión','3 solicitudes/s durante 20 s: aprobado. A 4 solicitudes/s, p95 de 2.802 ms supera el objetivo de 1.000 ms.']], [WIDTH*.32,WIDTH*.68]),
    h('Interpretación'), p('Una solicitud por segundo no equivale a un usuario simultáneo. Los 7 usuarios virtuales activos máximos observados en la confirmación de 50 solicitudes/s son ejecutores del ensayo, no una estimación del número de personas que admite el sistema. La capacidad pública requiere una prueba independiente.'),
    note('p95 indica que el 95 % de las duraciones HTTP medidas estuvo por debajo de ese valor. No incluye las iteraciones descartadas antes de comenzar: por eso se evalúan también los descartes y errores.')]
s += [PageBreak(),h('Método y condiciones de medición'),
    p('k6 2.3.0 con ejecutor constant-arrival-rate. Mezcla autenticada: 40 % dashboard, 20 % perfiles paginados, 20 % solicitudes, 15 % listado de documentos y 5 % certificados PDF. Se verificaron el contenido de las respuestas y la firma PDF, además del estado HTTP.'),
    table([['Condición','Configuración'],['Equipo','Intel Core i3-N300; 8 CPU lógicas; 7,73 GiB RAM; Windows 10.0.26300.'],['Memoria libre al iniciar','0,65 GiB. Equipo compartido con otras aplicaciones.'],['Topología','Generador k6, API Node 24 y MongoDB temporal de un nodo en el mismo portátil.'],['Datos','152 perfiles sintéticos iniciales, más altas de los casos funcionales; lecturas durante la carga.'],['Límites de peticiones','Desactivados solo en la API local de capacidad. Autenticación y permisos permanecieron activos.'],['Ejecución','50 VU preasignados, máximo 100; ventana de finalización de 15 s; timeout HTTP de 10 s.']], [WIDTH*.32,WIDTH*.68]),
    h('Criterios de aprobación'),p('Carga mixta: p95 inferior a 500 ms; certificados PDF: p95 inferior a 1.500 ms; errores HTTP y de negocio inferiores al 1 %; ninguna iteración descartada. Inicio de sesión: p95 inferior a 1.000 ms y los mismos criterios de errores y descartes.'),
    h('Muestra confirmada a 50 solicitudes/s'),table([['Operación','Solicitudes'],['Dashboard',1200],['Perfiles',600],['Solicitudes',600],['Listado de documentos',450],['Certificado PDF',150]], [WIDTH*.7,WIDTH*.3])]
s += [PageBreak(),h('Resultados por etapa'),note('Las cifras de duración corresponden a la ventana de generación; las solicitudes que terminan después pueden reducir la tasa lograda. Las pausas del equipo afectan estas mediciones locales.')]
rows=[['Carga / s','Tiempo','HTTP','p95 ms','Descartes','Estado']]
for r in P['runs']:
    rows.append([('Login ' if r['kind']=='login' else '')+str(r['targetRps']),r['duration'],r['requests'],num(r['p95Ms']),r['droppedIterations'],'Pasa' if r['passed'] else 'Falla'])
s += [table(rows,[WIDTH*.2,WIDTH*.12,WIDTH*.14,WIDTH*.16,WIDTH*.16,WIDTH*.22]),Spacer(1,8),p('El primer fallo de la escalera corta fue a 150 solicitudes/s: 5 iteraciones descartadas. A 200 solicitudes/s se descartaron 62. La confirmación de 125 solicitudes/s tuvo una duración máxima HTTP observada de 25.688 ms, compatible con una pausa o saturación del entorno compartido; no se atribuye una causa única sin perfilar CPU, memoria y planificador.')]
s += [PageBreak(),h('Comparación de las confirmaciones de 60 segundos')]
chart = Drawing(WIDTH,210)
bc = VerticalBarChart();bc.x=42;bc.y=35;bc.width=WIDTH-65;bc.height=140
bc.data=[[r['achievedRps'] for r in sorted(P['runs'],key=lambda r:r['targetRps']) if r['kind']=='mixed' and r['duration']=='60s']]
bc.categoryAxis.categoryNames=['Objetivo 50','Objetivo 100','Objetivo 125'];bc.categoryAxis.labels.fontName='Segoe';bc.categoryAxis.labels.fontSize=9
bc.valueAxis.valueMin=0;bc.valueAxis.valueMax=140;bc.valueAxis.valueStep=20;bc.valueAxis.labels.fontName='Segoe';bc.bars[0].fillColor=TEAL
chart.add(bc);chart.add(String(42,192,'Solicitudes HTTP completadas por segundo',fontName='SegoeBold',fontSize=10,fillColor=NAVY))
s += [chart,p('Solo la confirmación de 50 solicitudes/s cumplió todos los criterios. Un p95 bajo por sí solo no acredita capacidad cuando el generador no logra iniciar la carga prevista.'),
    h('Protección pública y próximos pasos'),p('En modo normal, la API limita cada IP a 120 solicitudes/minuto y la autenticación a 20 intentos/15 minutos. Son controles de abuso y pueden limitar un acceso compartido por muchos usuarios; no se deben desactivar para interpretar este ensayo como capacidad pública.'),
    p('Para dimensionar producción: separar el generador de carga, usar preproducción con recursos equivalentes a Vercel/Atlas, registrar CPU, memoria y latencia de base de datos, y ejecutar pruebas más prolongadas. El coste de bcrypt puede influir en el inicio de sesión; no debe reducirse su seguridad para mejorar estas cifras.'),
    h('Referencias del método'),note('Grafana k6: <link href="https://grafana.com/docs/k6/latest/using-k6/thresholds/" color="#087f80">umbrales de aprobación</link> y <link href="https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/" color="#087f80">constant-arrival-rate</link>.')]+provenance()
build('informe-rendimiento-k6.pdf',s)

S=D['security']
s=intro('Seguridad con OWASP ZAP','Escaneo activo local autenticado y revisión de alertas. ZAP 2.17.0.')
s += [p('0 altas · 1 media · 1 baja','MetricS'),p('Además se registraron 4 clases informativas. Se deduplicaron las alertas por regla y nombre entre los dos sitios locales; no se sumaron repeticiones de una misma clase como nuevas vulnerabilidades.'),
    h('Hallazgo que requiere seguimiento'),p('<b>CSP: style-src unsafe-inline (10055).</b> La política permite estilos en línea. La excepción también aparece en la CSP publicada. Es una mejora de endurecimiento confirmada; el escaneo no demostró una explotación XSS. Se recomienda identificar los estilos que dependen de ella y migrarlos antes de retirarla, verificando la interfaz.'),
    h('Alerta limitada al laboratorio'),p('<b>X-Powered-By: Express (10037).</b> La cabecera procede del servidor estático auxiliar usado en las pruebas. No apareció en las cuatro rutas públicas contrastadas, por lo que no se atribuye al despliegue como una vulnerabilidad confirmada.'),
    h('Dependencias y contraste público'),p('npm audit informó <b>0 vulnerabilidades</b> en el conjunto auditado. Las rutas públicas de inicio, login, salud y disponibilidad respondieron HTTP 200. Esto confirma su respuesta en ese momento; no representa una auditoría de toda la infraestructura.'),
    note('Cero alertas altas en este escaneo no significa ausencia de vulnerabilidades. La cobertura depende del rastreo, la política activa y los recorridos alcanzados.')]
s += [PageBreak(),h('Alcance y configuración'),table([['Elemento','Configuración aplicada'],['Destino','Solo 127.0.0.1:4174 (frontend compilado) y 127.0.0.1:8101 (API).'],['Autenticación','Token sintético de administrador, inyectado únicamente en la API local.'],['Descubrimiento','11 solicitudes iniciales, crawler tradicional de hasta 1 minuto, profundidad 3 y 10 hijos por nodo.'],['Escaneo activo','Intensidad LOW, umbral MEDIUM, 2 hilos, demora 10 ms; máximo 1 minuto por regla y 3 minutos por escaneo.'],['Ejecución final','Trabajo finalizado con código 0 y sin advertencias de automatización; escaneo activo de aproximadamente 64 segundos.'],['Exclusiones','Rutas de identidad interna y registro/logout en la exploración activa. Sin spider DOM/AJAX ni navegación real de usuario.']], [WIDTH*.28,WIDTH*.72]),
    h('Controles complementarios'),p('Las verificaciones funcionales probaron autorización entre propietarios, permisos por rol, CSRF, cookies HttpOnly/Secure/SameSite, rechazo de JSON no válido, token inválido y operadores NoSQL en el login. También se comprobaron los límites de tasa con la protección habilitada.'),
    h('Separación de entornos'),p('La aplicación probada utiliza la misma factoría Express, con una base MongoDB temporal. El puerto de capacidad conserva autenticación y permisos y deshabilita solo los límites de tasa para que el escáner pueda completar su recorrido. No se atacó el sitio publicado ni se cargaron datos en Atlas.'),
    note('Inicio de la ejecución ZAP: '+S['start']+' UTC. Fin: '+S['end']+' UTC.')]
s += [PageBreak(),h('Inventario y revisión de alertas')]
for a in S['alerts']:
    risk={0:'Informativa',1:'Baja',2:'Media',3:'Alta'}[a['riskCode']]
    s += [KeepTogether([h(risk+' / '+a['reference']),p(escape(a['name'])),note('Instancias observadas: '+str(a['count'])+'. Revisión: '+escape(a['review'])+'.'),p(escape(a['reviewDetail']))])]
s += [PageBreak(),h('Plan de mejora priorizado'),table([['Prioridad','Acción','Criterio de cierre'],['1','Revisar la dependencia de estilos inline y endurecer la CSP.','Eliminar unsafe-inline cuando la interfaz siga funcionando sin infracciones necesarias.'],['2','Ampliar cobertura de recorridos autenticados con navegador.','Recorrer roles, formularios y acciones dinámicas y repetir el análisis pasivo.'],['3','Repetir el análisis ante cambios de autenticación, dependencias o rutas.','Comparar alertas nuevas y mantener una revisión manual de su evidencia.']], [WIDTH*.12,WIDTH*.44,WIDTH*.44]),
    h('Límites de esta evaluación'),p('No se evaluaron todas las combinaciones de permisos, lógica de negocio adversaria, infraestructura de nube, copias de seguridad, ingeniería social ni continuidad operativa. El certificado TLS y la seguridad de Atlas no se auditaron de forma exhaustiva. Los resultados son una fotografía del código y el entorno descritos.'),
    h('Referencias'),note('<link href="https://www.zaproxy.org/docs/automate/automation-framework/" color="#087f80">OWASP ZAP Automation Framework</link> · <link href="https://www.zaproxy.org/docs/desktop/addons/automation-framework/job-ascan/" color="#087f80">Configuración del escaneo activo</link>.')]+provenance()
build('informe-seguridad-zap.pdf',s)
