"""Cuatro informes reproducibles desde JSON revisados; no lee .env ni sesiones."""
import json
import os
import re
import shutil
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.barcharts import VerticalBarChart
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
DATE = os.environ.get('REPORT_DATE', '2026-11-14')
assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', DATE)
PUBLIC = ROOT / 'docs/pruebas' / DATE
OUT = ROOT / 'output/pdf'
OUT.mkdir(parents=True, exist_ok=True)
D = json.loads((PUBLIC / 'resultados.json').read_text(encoding='utf-8'))
V = json.loads((PUBLIC / 'zap-vercel-resultados.json').read_text(encoding='utf-8')) if (PUBLIC / 'zap-vercel-resultados.json').exists() else None
NAVY, TEAL, INK, MUTED, AMBER = [colors.HexColor(value) for value in ['#142c45', '#087f80', '#26374a', '#526477', '#a75809']]
pdfmetrics.registerFont(TTFont('Segoe', 'C:/Windows/Fonts/segoeui.ttf'))
pdfmetrics.registerFont(TTFont('SegoeBold', 'C:/Windows/Fonts/segoeuib.ttf'))
pdfmetrics.registerFontFamily('Segoe', normal='Segoe', bold='SegoeBold')
ST = getSampleStyleSheet()
ST['BodyText'].fontName = 'Segoe'; ST['BodyText'].fontSize = 9.2; ST['BodyText'].leading = 13.6; ST['BodyText'].textColor = INK
ST.add(ParagraphStyle(name='TitleS', fontName='SegoeBold', fontSize=27, leading=32, textColor=NAVY, spaceAfter=13))
ST.add(ParagraphStyle(name='HeadS', fontName='SegoeBold', fontSize=13.5, leading=18, textColor=TEAL, spaceBefore=11, spaceAfter=7, keepWithNext=True))
ST.add(ParagraphStyle(name='MetricS', fontName='SegoeBold', fontSize=20, leading=26, textColor=TEAL, spaceAfter=10))
ST.add(ParagraphStyle(name='CellS', fontName='Segoe', fontSize=8.1, leading=10.8, textColor=INK))
ST.add(ParagraphStyle(name='WhiteS', parent=ST['CellS'], fontName='SegoeBold', textColor=colors.white))
ST.add(ParagraphStyle(name='SmallS', fontName='Segoe', fontSize=8, leading=11.5, textColor=MUTED))
W = A4[0] - 36 * mm
DAY = '/'.join(reversed(DATE.split('-')))

def p(text, style='BodyText'):
    return Paragraph(text, ST[style])

def h(text):
    return p(text, 'HeadS')

def safe(value):
    return escape(str(value))

def number(value, digits=1):
    return 'n/d' if value is None else f'{value:,.{digits}f}'.translate(str.maketrans({',': '.', '.': ','}))

def local(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(timezone(timedelta(hours=-5))).strftime('%d/%m/%Y %H:%M:%S')

def table(rows, fractions):
    data = [[p(safe(cell), 'WhiteS' if i == 0 else 'CellS') for cell in row] for i, row in enumerate(rows)]
    item = Table(data, colWidths=[W * value for value in fractions], repeatRows=1, hAlign='LEFT')
    item.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f1f6f9'), colors.white]),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5), ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7)]))
    return item

def chrome(canvas, doc):
    canvas.saveState(); canvas.setFillColor(NAVY); canvas.rect(0, A4[1]-16*mm, A4[0], 16*mm, fill=1, stroke=0)
    canvas.setFont('SegoeBold', 9); canvas.setFillColor(colors.white); canvas.drawString(18*mm, A4[1]-10*mm, 'SESHA APP  /  EVIDENCIAS DE CALIDAD')
    canvas.setStrokeColor(TEAL); canvas.line(18*mm, 16*mm, A4[0]-18*mm, 16*mm)
    canvas.setFont('Segoe', 8); canvas.setFillColor(MUTED); canvas.drawString(18*mm, 10*mm, f'Revisión {DAY} | America/Bogota')
    canvas.drawRightString(A4[0]-18*mm, 10*mm, str(doc.page)); canvas.restoreState()

def intro(title, subtitle):
    return [Spacer(1, 8*mm), p(title, 'TitleS'), p(subtitle), Spacer(1, 5*mm)]

def provenance():
    return [h('Trazabilidad y conservación'), p('Aplicación de referencia: commit <b>'+safe(D['source']['commit'][:12])+'</b>. La identificación SHA-256 completa, las horas y los resultados numéricos están en <b>resultados.json</b>.'),
        p('Los informes del 13/11/2026 se conservan en su carpeta histórica. Esta edición publica una campaña nueva, sin modificar las evidencias anteriores.'),
        p('No se publican contraseñas, cookies, tokens, cadenas de conexión, cuerpos de respuestas privadas ni registros crudos de los escáneres. Los archivos originales permanecen en .qa/, excluidos de Git y Pages.', 'SmallS')]

manifest = []
def build(name, story):
    target = OUT / name
    SimpleDocTemplate(str(target), pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=24*mm, bottomMargin=23*mm,
        title=name.replace('-', ' ').removesuffix('.pdf'), author='SESHA APP - Proyecto SENA').build(story, onFirstPage=chrome, onLaterPages=chrome)
    reader = PdfReader(target)
    text = '\n'.join(page.extract_text() or '' for page in reader.pages)
    assert all(len(page.extract_text() or '') > 100 for page in reader.pages), 'Página vacía'
    assert not re.search(r'mongodb\+srv://|sesha_session=|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', text)
    shutil.copy2(target, PUBLIC / name)
    entry = {'file': name, 'pages': len(reader.pages), 'bytes': target.stat().st_size}
    manifest.append(entry); print(json.dumps(entry))

F = D['functional']
s = intro('Pruebas funcionales', 'Acceso, permisos, persistencia y remediación de credenciales. Evidencia local y comprobaciones limitadas del sitio publicado.')
s += [p(f"{F['passed']} / {F['total']} comprobaciones locales", 'MetricS'),
    table([['Conjunto', 'Aprobadas', 'Fallidas'], ['Backend', F['backend']['passed'], F['backend']['failed']],
        ['Frontend', F['frontend']['passed'], F['frontend']['failed']], ['HTTP con MongoDB temporal', F['http']['passed'], F['http']['failed']],
        ['Comprobaciones de publicación (separadas)', F['production']['passed'], F['production']['failed']]], [.64, .18, .18]),
    h('Qué se comprobó'), p('Cookie HttpOnly y CSRF, control por rol y propietario, documentos PDF, solicitudes, perfiles y constancias. El cambio de clave exige la anterior, usa bcrypt de coste 12 y revoca sesiones. El alta administrativa crea cuenta y perfil en una transacción; el registro público de producción permanece cerrado.'),
    p('También se comprobaron destino exacto y autorización de las cuarentenas, cancelación ante conflictos y reversión si falla una escritura. Los ensayos usan cuentas ficticias y no cambian datos de producción.'),
    h('Protecciones de tasa'), p(f"API: la petición {D['protection']['api']['firstBlockedRequest']} devuelve HTTP 429. Autenticación: el intento {D['protection']['auth']['firstBlockedRequest']} devuelve HTTP 429. Se probaron en el puerto estricto, separado de la medición de capacidad."),
    p('Las evidencias de Vitest se conservan de esta misma versión del código; las verificaciones HTTP se repitieron para esta campaña. Las fechas por conjunto figuran en el JSON. No se presenta una ejecución conservada como si acabara de repetirse.', 'SmallS')]
for suite in ['HTTP', 'Backend', 'Frontend']:
    cases = [item for item in F['tests'] if item['suite'] == suite]
    chunk = 18 if suite != 'Frontend' else 15
    for start in range(0, len(cases), chunk):
        s += [PageBreak(), h(f'{suite}: casos {start+1} a {min(start+chunk, len(cases))}'),
            table([['Caso', 'Estado', 'ms']] + [[item['name'], 'Aprobado' if item['status'] == 'passed' else item['status'], number(item['durationMs'])] for item in cases[start:start+chunk]], [.77, .13, .10])]
s += [PageBreak(), h('Verificaciones del dominio publicado'), p(safe(F['production']['target'])+' | '+local(F['production']['executedAt'])+' (Colombia).'),
    table([['Comprobación', 'Resultado']] + [[item['name'], 'Aprobada' if item['passed'] else 'Fallida'] for item in F['production']['checks']], [.82, .18]),
    h('Límites de esta evidencia'), p('Las pruebas de componentes y HTTP no sustituyen una revisión visual de todos los navegadores, accesibilidad manual o un teléfono físico. La automatización visual anterior quedó bloqueada por la herramienta. No se hicieron pruebas de carga sobre Vercel o Atlas.')]+provenance()
build('informe-pruebas-funcionales.pdf', s)

P = D['performance']; sustained = P['sustained']; env = D['environment']
s = intro('Rendimiento con k6', 'Carga exclusivamente local sobre la aplicación actual y MongoDB temporal. No representa la capacidad de Vercel, Atlas ni usuarios simultáneos.')
if sustained:
    s += [p(f"{sustained['targetRps']} solicitudes/s durante 60 s", 'MetricS'),
        p(f"Confirmación aprobada: {number(sustained['requests'], 0)} solicitudes, p95 <b>{number(sustained['p95Ms'])} ms</b>, p99 <b>{number(sustained['p99Ms'])} ms</b>, {sustained['droppedIterations']} iteraciones descartadas. Errores HTTP: {number(100*sustained['failedRate'], 2)} %."),
        p('Inicio de la confirmación: '+local(sustained['start'])+' (Colombia).')]
else:
    s += [p('Sin carga sostenida confirmada', 'MetricS'), p('Ninguna etapa de 60 segundos cumplió todos los umbrales. No se atribuye una capacidad sostenida a partir de picos cortos.')]
s += [h('Aprobaciones y límites observados'), table([['Escenario', 'Resultado'],
    ['Mayor pico aprobado de 25 s', str(P['shortPeak']['targetRps'])+' solicitudes/s' if P['shortPeak'] else 'Ninguno'],
    ['Mayor login aprobado de 20 s', str(P['loginPassed']['targetRps'])+' solicitudes/s' if P['loginPassed'] else 'Ninguno'],
    ['Etapas fuera de umbral', str(sum(not item['passed'] for item in P['runs']))+'; se muestran íntegramente en la tabla de resultados'],
    ['Recuperación final', 'Aprobada' if P['runs'][-1]['passed'] else 'No aprobada']], [.48, .52]),
    h('Interpretación'), p('Un escalón fallido marca el límite observado del ensayo, no se elimina del informe. Un p95 bajo no compensa iteraciones descartadas antes de comenzar. Las solicitudes/s no equivalen a usuarios simultáneos y una confirmación de un minuto no es una prueba de resistencia de horas.')]
s += [PageBreak(), h('Método, equipo y criterios'), table([['Condición', 'Configuración'],
    ['Generador', P['version']+'; constant-arrival-rate; 50 VU preasignados y máximo 100'],
    ['Tiempo máximo por petición', '10 s; ventana de finalización de 15 s'],
    ['Mezcla', '40 % dashboard; 20 % empleados; 20 % solicitudes; 15 % documentos; 5 % constancias PDF'],
    ['Equipo', f"{env['cpu']}; {env['logicalCpus']} CPU lógicas; {number(env['totalMemoryGB'], 2)} GiB RAM"],
    ['Memoria libre al inicio', number(env['freeMemoryGB'], 2)+' GiB; equipo compartido con otras aplicaciones'],
    ['Runtime y datos', env['node']+'; '+env['database']+'; '+str(env['seededProfiles'])+' perfiles sintéticos iniciales'],
    ['Topología', 'Generador, API y MongoDB comparten el portátil; solo loopback'],
    ['Límites', 'Desactivados únicamente en el puerto 8101 de capacidad; autenticación y permisos conservados']], [.31, .69]),
    h('Umbrales'), p('Mezcla: p95 inferior a 500 ms; PDF: p95 inferior a 1.500 ms. Login: p95 inferior a 1.000 ms. Errores HTTP y de negocio inferiores al 1 %, con cero iteraciones descartadas. La escalera se detiene al primer fallo y después refina y confirma un nivel durante 60 s.'),
    p('No se ejecutó ZAP ni se generaron los PDF durante la medición, para reducir competencia de CPU. El entorno sigue siendo un equipo compartido.', 'SmallS')]
s += [PageBreak(), h('Resultados de todas las etapas'), table([['Etapa', 'Tiempo', 'HTTP', 'p95 ms', 'Descartes', 'Estado']] +
    [[item['label'], item['duration'], item['requests'], number(item['p95Ms']), item['droppedIterations'], 'Pasa' if item['passed'] else 'Falla'] for item in P['runs']], [.25, .10, .13, .15, .15, .22]),
    h('Errores y carga lograda'), table([['Etapa', 'HTTP %', 'Negocio %', 'Tasa lograda/s']] +
    [[item['label'], number(item['failedRate']*100, 2), number(item['businessFailedRate']*100, 2), number(item['achievedRps'])] for item in P['runs'] if not item['passed'] or item == sustained], [.37, .18, .18, .27])]
plot_runs = [item for item in P['runs'] if item['kind'] == 'mixed' and item['duration'] in ['25s', '60s']]
if plot_runs:
    chart = VerticalBarChart(); chart.x = 40; chart.y = 52; chart.width = W-65; chart.height = 140
    chart.data = [tuple(item['p95Ms'] for item in plot_runs)]; chart.valueAxis.valueMin = 0
    chart.valueAxis.labels.fontName = 'Segoe'; chart.valueAxis.labels.fontSize = 8
    chart.categoryAxis.categoryNames = [str(item['targetRps'])+'/'+item['duration'] for item in plot_runs]
    chart.categoryAxis.labels.fontName = 'Segoe'; chart.categoryAxis.labels.fontSize = 7; chart.categoryAxis.labels.angle = 35; chart.categoryAxis.labels.boxAnchor = 'ne'
    for i, item in enumerate(plot_runs): chart.bars[(0, i)].fillColor = TEAL if item['passed'] else AMBER
    drawing = Drawing(W, 210); drawing.add(chart)
    s += [PageBreak(), h('Latencia p95 por etapa mixta'), drawing,
        p('Eje horizontal: tasa objetivo / duración. Eje vertical: milisegundos. Verde: cumple todos los criterios; naranja: incumple al menos uno. El color considera también errores y descartes, no solo la altura de la barra.', 'SmallS')]
s += [h('Conclusión y siguiente alcance'), p('Esta campaña permite comparar ejecuciones locales con sus condiciones registradas. Para estimar producción se requiere un entorno equivalente autorizado y una prueba específica; no se extrapolan las cifras del portátil.')]+provenance()
build('informe-rendimiento-k6.pdf', s)

def risk_metric(risk):
    return f"{risk['high']} altas | {risk['medium']} medias | {risk['low']} bajas"

def alert_pages(data):
    story = [PageBreak(), h('Hallazgos por clase'), p('Se agrupan por referencia y nombre. Varias instancias de la misma regla no representan vulnerabilidades independientes.'),
        table([['Referencia', 'Clase', 'Riesgo', 'Instancias']] + [[item['reference'], item['name'], ['Informativo', 'Bajo', 'Medio', 'Alto'][item['riskCode']], item['count']] for item in data['alerts']], [.15, .49, .18, .18])]
    for item in data['alerts']:
        story += [KeepTogether([h(item['reference']+' - '+item['name']), p(safe(item['review']))]),
            p('Rutas: '+safe(', '.join(item['paths'])), 'SmallS')]
    return story

L = D['security']; risk = L['riskCounts']
s = intro('Seguridad: ZAP local', 'Escaneo activo autenticado con sesiones ficticias en un entorno temporal. Separado del análisis sobre Vercel.')
s += [p(risk_metric(risk), 'MetricS'), p(f"Además: {risk['informational']} clases informativas. ZAP {L['version']} terminó con código {L['code']}."),
    h('Destino y ventana'), p('127.0.0.1:4174 y 127.0.0.1:8101.<br/>Inicio: '+local(L['start'])+'<br/>Fin: '+local(L['end'])+' (Colombia).'),
    h('Política aplicada'), table([['Control', 'Alcance'], ['Autenticación', 'Token sintético del administrador de la base temporal; nunca una clave real'],
    ['Exploración', 'Requestor, crawler tradicional, análisis pasivo y activo'], ['Límite activo', str(L['activeMinutesLimit'])+' minutos; '+str(L['threads'])+' hilos'],
    ['Datos', 'MongoDB temporal y perfiles ficticios; sin conexión a Atlas'], ['Exclusiones', 'Sin DOM/AJAX spider ni evaluación visual integral']], [.29, .71]),
    h('Cambios frente a la edición histórica'), p('Se retiró unsafe-inline de la política de estilos y X-Powered-By de los servidores auxiliares. La clasificación que aparece aquí proviene de esta nueva ejecución; la edición del 13/11 se conserva para comparación.')]
s += alert_pages(L)
s += [PageBreak(), h('Contraste de publicación y dependencias'),
    table([['Ruta pública', 'Estado HTTP', 'X-Powered-By']] + [[item['route'], item['status'], item['headers'].get('x-powered-by') or 'No presente'] for item in L['productionHeaders']['results']], [.40, .25, .35]),
    p('El contraste de cabeceras son cuatro GET sin escaneo activo. El análisis de dependencias informó '+str(L['npmAudit']['total'])+' vulnerabilidades conocidas en la consulta registrada.'),
    h('Cómo interpretar el resultado'), p('Una alerta informativa no demuestra por sí sola explotación ni exposición de secretos. Cero alertas altas no acredita ausencia total de vulnerabilidades. La revisión es acotada a las rutas, reglas y duración indicadas.'),
    p('<link href="https://www.zaproxy.org/docs/desktop/addons/automation-framework/" color="#087f80">Documentación oficial del marco de automatización ZAP</link>', 'SmallS')]+provenance()
build('informe-seguridad-zap.pdf', s)

if V is None:
    print('Tres PDF locales generados; el informe autenticado de Vercel sigue pendiente.')
    sys.exit(0)
risk = V['riskCounts']; E = V['execution']; C = V['checks']
s = intro('Seguridad: ZAP en Vercel', 'Revisión autenticada del sitio de producción, autorizada y limitada a lecturas y dos reglas activas de bajo impacto.')
s += [p(risk_metric(risk), 'MetricS'), p(f"Además: {risk['informational']} clases informativas. ZAP {V['zapVersion']} terminó con código {E['code']}."),
    h('Destino y versión'), p(safe(V['target'])+'<br/>Commit: <b>'+safe(V['deployment']['commit'][:12])+'</b><br/>Despliegue: '+safe(V['deployment']['id'])),
    p('Inicio: '+local(V['start'])+'<br/>Fin: '+local(V['end'])+' (Colombia).'),
    h('Controles antes y después'), table([['Control', 'Resultado'], ['Disponibilidad final', 'HTTP '+str(C['readyStatus'])], ['Dashboard anónimo', 'HTTP '+str(C['anonymousDashboardStatus'])],
        ['Conteos de negocio', 'Sin cambios' if C['countersUnchanged'] else 'Diferencia observada: revisar contexto'], ['Interrupción por salud', 'Sí' if E['stoppedForHealth'] else 'No']], [.47, .53]),
    p('Las sesiones fueron iniciadas por el propietario mediante un formulario local con campos enmascarados. Las contraseñas no se guardaron ni se incorporaron a los scripts. Los informes públicos no contienen sesiones.', 'SmallS')]
s += [PageBreak(), h('Reglas activas y alcance real'), table([['Regla completada', 'Peticiones', 'Alertas', 'Segundos']] +
    [[item['rule'], item['requests'], item['alerts'], number(item['seconds'])] for item in E['activeEvidence']], [.50, .17, .16, .17]),
    p('Se analizaron limit y page en GET /api/empleados. Regla 40012: XSS reflejado; regla 40033: inyección NoSQL MongoDB. Un hilo, pausa de 1.500 ms y límite activo de tres minutos. Las protecciones de producción permanecieron habilitadas.'),
    h('Rutas y recursos revisados pasivamente'), table([['Ruta conocida']] + [[item] for item in dict.fromkeys(E['passiveRoutes'])], [1]),
    p('La sesión del administrador se añadió únicamente a la API del dominio autorizado. No se usaron spider, formularios de escritura, carga de archivos, fuerza bruta ni pruebas de carga en Vercel.', 'SmallS')]
s += alert_pages(V)
s += [PageBreak(), h('Contraste autenticado de CORS y caché'), table([['Lectura', 'HTTP', 'Cache-Control', 'ACAO']] +
    [[item['name'], item['status'], item['headers'].get('cache-control') or '-', 'Origen SESHA' if item['headers'].get('access-control-allow-origin') == V['target'] else item['headers'].get('access-control-allow-origin') or '-'] for item in V['manualReview']['checks']], [.36, .12, .30, .22]),
    p('En la tabla, «Origen SESHA» corresponde exactamente a https://sesha-app.vercel.app. Los valores completos se conservan en el JSON revisado.', 'SmallS'),
    p('Se verificó que administrador y empleado recibieran sus perfiles respectivos y que el acceso anónimo fuera rechazado. La API con una sesión válida y un origen ajeno se contrastó por separado del HTML público.'),
    p('CORS comodín en un recurso público no equivale automáticamente a exponer datos autenticados. Se conserva la severidad que reportó ZAP y se documenta el alcance de las lecturas; no se afirma una auditoría exhaustiva de caché.'),
    h('Límites y conservación'), p(safe(V['limitations'])),
    p('Los contadores ordinarios de seguridad y los registros del proveedor pueden variar por estas peticiones. El contraste de preservación se refiere a cuentas/perfiles, documentos y solicitudes, no a esos contadores técnicos.'),
    p('<link href="https://www.zaproxy.org/docs/alerts/40012/" color="#087f80">ZAP 40012</link> | <link href="https://www.zaproxy.org/docs/alerts/40033/" color="#087f80">ZAP 40033</link>', 'SmallS')]+provenance()
build('informe-seguridad-zap-vercel.pdf', s)
(PUBLIC / 'documentos.json').write_text(json.dumps({'date': DATE, 'files': manifest}, indent=2), encoding='utf-8')
