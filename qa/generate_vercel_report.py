"""Informe adicional: resultados de ZAP contra Vercel, sin sesiones ni cuerpos privados."""
import json
import shutil
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parent.parent
PUBLIC=ROOT/'docs/pruebas/2026-11-13'
D=json.loads((PUBLIC/'zap-vercel-resultados.json').read_text(encoding='utf-8'))
NAVY=colors.HexColor('#142c45'); TEAL=colors.HexColor('#087f80'); INK=colors.HexColor('#26374a')
pdfmetrics.registerFont(TTFont('Segoe','C:/Windows/Fonts/segoeui.ttf'))
pdfmetrics.registerFont(TTFont('SegoeBold','C:/Windows/Fonts/segoeuib.ttf'))
pdfmetrics.registerFontFamily('Segoe',normal='Segoe',bold='SegoeBold')
st=getSampleStyleSheet()
st['BodyText'].fontName='Segoe';st['BodyText'].fontSize=9.4;st['BodyText'].leading=14;st['BodyText'].textColor=INK
st.add(ParagraphStyle(name='TitleS',fontName='SegoeBold',fontSize=26,leading=31,textColor=NAVY,spaceAfter=16))
st.add(ParagraphStyle(name='HeadS',fontName='SegoeBold',fontSize=14,leading=19,textColor=TEAL,spaceBefore=14,spaceAfter=8))
st.add(ParagraphStyle(name='MetricS',fontName='SegoeBold',fontSize=19,leading=25,textColor=TEAL,spaceAfter=8))
st.add(ParagraphStyle(name='CellS',fontName='Segoe',fontSize=8.3,leading=12,textColor=INK))
st.add(ParagraphStyle(name='WhiteS',parent=st['CellS'],fontName='SegoeBold',textColor=colors.white))
W=A4[0]-36*mm
def p(text,style='BodyText'):return Paragraph(text,st[style])
def h(text):return p(text,'HeadS')
def table(rows,widths):
    t=Table([[p(escape(str(c)),'WhiteS' if i==0 else 'CellS') for c in row] for i,row in enumerate(rows)],colWidths=widths,repeatRows=1)
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),NAVY),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#f1f6f9'),colors.white]),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8)]))
    return t
def chrome(c,doc):
    c.saveState();c.setFillColor(NAVY);c.rect(0,A4[1]-16*mm,A4[0],16*mm,fill=1,stroke=0)
    c.setFont('SegoeBold',9);c.setFillColor(colors.white);c.drawString(18*mm,A4[1]-10*mm,'SESHA APP  /  PROYECTO SENA')
    c.setStrokeColor(TEAL);c.line(18*mm,16*mm,A4[0]-18*mm,16*mm)
    c.setFillColor(INK);c.setFont('Segoe',8);c.drawString(18*mm,11*mm,'ZAP sobre Vercel · 13 noviembre 2026 · America/Bogota');c.drawRightString(A4[0]-18*mm,11*mm,str(doc.page));c.restoreState()
r=D['riskCounts']
local=lambda value: datetime.fromisoformat(value.replace('Z','+00:00')).astimezone(ZoneInfo('America/Bogota')).strftime('%d/%m/%Y %H:%M:%S')
s=[Spacer(1,10*mm),p('Seguridad en Vercel','TitleS'),p('Informe adicional de OWASP ZAP sobre el sitio publicado. Complementa la evaluación local y conserva su alcance por separado.'),Spacer(1,6*mm),
   p(f"{r['high']} altas · {r['medium']} medias · {r['low']} bajas",'MetricS'),p(f"Además se registraron {r['informational']} clases informativas. Las repeticiones de una regla se agrupan por referencia y nombre; no representan vulnerabilidades independientes."),
   h('Destino y ejecución'),p('<b>https://sesha-app.vercel.app</b><br/>Inicio: '+local(D['start'])+'<br/>Fin: '+local(D['end'])+' (hora de Colombia).'),
   h('Resultado de la aplicación'),table([['Control','Observación'],['Ejecución ZAP','Código de salida '+str(D['execution']['code'])+'.'],['Disponibilidad final','/api/ready respondió HTTP '+str(D['checks']['readyStatus'])+'.'],['Acceso sin sesión','Dashboard respondió HTTP '+str(D['checks']['anonymousDashboardStatus'])+'.'],['Conteos de datos','Sin cambios entre las lecturas previas y posteriores.' if D['checks']['countersUnchanged'] else 'Se detectó una diferencia; requiere revisión.']],[W*.34,W*.66]),
   h('Pruebas activas completadas'),p('ZAP completó 10 peticiones de XSS reflejado y 12 de NoSQL MongoDB, sin alertas activas en los parámetros de paginación comprobados. La fase activa duró aproximadamente 37 segundos.'),
   h('Lectura correcta de los resultados'),p('Los resultados describen únicamente las rutas y reglas alcanzadas en esta ejecución. Un escaneo sin alertas de una clase no prueba la ausencia de esa vulnerabilidad en otros flujos. No se hizo una prueba de carga, un pentest exhaustivo ni una validación visual del navegador.'),
   PageBreak(),h('Alcance y límites aplicados'),table([['Componente','Qué se hizo'],['Revisión pasiva',str(len(D['execution']['passiveRoutes']))+' rutas y recursos conocidos: páginas de acceso, salud, disponibilidad, configuración laboral, perfil, dashboard, listados, certificado PDF, JavaScript y CSS.'],['Sesión','Un login académico previo. Cookie utilizada solo en la API del dominio autorizado. Sin publicar la sesión ni el contenido privado de las respuestas.'],['Escaneo activo','Solo GET /api/empleados?limit=5&page=1; parámetros limit y page.'],['Reglas activas','40012: XSS reflejado. 40033: inyección NoSQL MongoDB. Intensidad Low y umbral Medium. Las demás reglas activas permanecieron deshabilitadas.'],['Ritmo y duración','Un hilo; pausa configurada de 1.500 ms; máximo 1 minuto por regla y 3 minutos de análisis activo.'],['Exclusiones','Sin spider, DOM/AJAX, registro, logout, operaciones de escritura, cargas de archivos, fuerza bruta, reglas temporizadas ni pruebas de denegación de servicio.']],[W*.25,W*.75]),
   h('Protecciones conservadas'),p('Los límites públicos de peticiones, la autenticación y los permisos permanecieron activos. La configuración no deshabilitó el firewall ni alteró las variables del despliegue. Se monitorizó la disponibilidad durante el análisis; no hubo una interrupción del ensayo por este control.'),
   h('Cobertura que queda pendiente'),p('Los formularios de alta y modificación, las cargas de documentos, los recorridos DOM y los casos adversarios de todos los roles requieren evaluación adicional en un entorno de preproducción. La ausencia de una alerta NoSQL en parámetros de paginación no evalúa por completo otros puntos de entrada a MongoDB.'),
   PageBreak(),h('Alertas y revisión manual')]
for a in D['alerts']:
    risk={0:'Informativa',1:'Baja',2:'Media',3:'Alta'}[a['riskCode']]
    s += [h(risk+' / '+a['reference']),p(escape(a['name'])),p('Instancias: '+str(a['count'])+'. '+escape(a.get('reviewDetail','Pendiente de revisión manual.')))]
s += [PageBreak(),h('Trazabilidad de la evaluación'),table([['Identificador','Valor'],['ZAP',D['zapVersion']],['Commit publicado',D['deployment']['commit']],['Despliegue Vercel',D['deployment']['id']],['Reglas adicionales',', '.join(D['addOns'])]],[W*.28,W*.72]),
      h('Conservación de evidencias'),p('El resumen sanitizado se conserva en <b>zap-vercel-resultados.json</b>. Los archivos nativos de ZAP, sus sesiones y los cuerpos de respuesta se mantienen en la carpeta privada ignorada por Git. El plan temporal que contenía la cookie se eliminó al terminar.'),
      h('Prioridad de seguimiento'),p('Revisar las alertas confirmadas de endurecimiento y ampliar la cobertura de flujos antes de presentar este informe como una evaluación integral. Comparar futuras ejecuciones con este alcance y la misma política; los recuentos de un escaneo local más amplio y este análisis acotado no son directamente equivalentes.'),
      h('Referencias del método'),p('<link href="https://www.zaproxy.org/docs/desktop/addons/automation-framework/job-ascan/" color="#087f80">ZAP: escaneo activo y política de reglas</link><br/><link href="https://www.zaproxy.org/docs/alerts/40012/" color="#087f80">Regla 40012: XSS reflejado</link><br/><link href="https://www.zaproxy.org/docs/alerts/40033/" color="#087f80">Regla 40033: NoSQL MongoDB</link>')]
target=ROOT/'output/pdf/historico/2026-11-13/informe-seguridad-zap-vercel.pdf'
target.parent.mkdir(parents=True, exist_ok=True)
SimpleDocTemplate(str(target),pagesize=A4,leftMargin=18*mm,rightMargin=18*mm,topMargin=24*mm,bottomMargin=23*mm,title='SESHA - Seguridad ZAP en Vercel',author='SESHA APP - Proyecto SENA').build(s,onFirstPage=chrome,onLaterPages=chrome)
reader=PdfReader(target);text='\n'.join(page.extract_text() or '' for page in reader.pages)
assert all(len(page.extract_text() or '')>100 for page in reader.pages)
assert 'sesha_session=' not in text and 'mongodb+srv://' not in text
shutil.copy2(target,PUBLIC/target.name)
print(json.dumps({'pdf':target.name,'pages':len(reader.pages),'bytes':target.stat().st_size}))
