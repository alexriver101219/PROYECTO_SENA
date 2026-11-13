"""Manual ilustrado desde capturas reales de Edge y evidencias sanitizadas."""
import json
import re
import shutil
import subprocess
from datetime import datetime
from pathlib import Path
from xml.sax.saxutils import escape
from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / '.qa/handbook-2026-11-13'
PUBLIC = ROOT / 'docs/manual/2026-11-13'
ASSETS = PUBLIC / 'capturas'
ASSETS.mkdir(parents=True, exist_ok=True)
backup = json.loads((ROOT / '.qa/latest-backup.json').read_text(encoding='utf-8'))['result']
fixture = json.loads((SHOTS / 'api-fixtures.json').read_text(encoding='utf-8'))
assert backup['passed'] and fixture['cleaned'] and fixture['bytesMatch']
assert fixture['final'] == {'documents': 0, 'requests': 0}
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
proof = {
    'project': 'SESHA APP - Proyecto SENA', 'date': '2026-11-13', 'timezone': 'America/Bogota',
    'applicationCommit': commit, 'target': 'https://sesha-app.vercel.app',
    'backup': {key: backup[key] for key in ['startedAt', 'completedAt', 'sourceDatabase', 'sourceVersion', 'toolsVersion', 'archiveBytes', 'archiveSha256', 'restoreTarget', 'sourceReadOnly', 'changedDuringDump', 'checks', 'passed', 'scope']},
    'visualReview': {
        'browser': 'Microsoft Edge', 'desktop': '1280 x 752 píxeles lógicos',
        'mobile': {'kind': 'Emulación adaptable en Edge', 'widthCssPx': 400, 'heightCssPx': 547, 'physicalDeviceTested': False},
        'observed': ['Portada', 'Registro y 15 cargos', 'Login de empleado y administrador', 'Paneles y menús por rol', 'Perfil con cargo actualizado', 'Documentos y descarga de constancia', 'Solicitudes por rol', 'Directorio y formulario de edición', 'Estado Activo/Inactivo disponible', 'Navegación y formulario en móvil emulado', 'Desplazamiento horizontal hasta Editar en tabla móvil', 'Cierre de ambas sesiones'],
        'certificateDownloadedBytes': 58222,
        'registrationAccountCreatedInBrowser': False,
        'existingProfilesChangedDuringVisualReview': False,
        'uploadViaBrowserCompleted': False,
        'uploadLimitation': 'El control de aplicaciones no reconoció los campos del selector nativo de archivos. Se canceló ese diálogo y se verificó la carga mediante API.',
    },
    'apiCheck': {'uploadStatus': fixture['uploadStatus'], 'downloadStatus': fixture['downloadStatus'], 'bytes': fixture['bytes'], 'bytesMatch': fixture['bytesMatch'], 'requestStatus': fixture['requestStatus'], 'fixturesRemoved': fixture['cleaned'], 'finalDocuments': fixture['final']['documents'], 'finalRequests': fixture['final']['requests'], 'profilesVerifiedAfterReview': 152, 'registrationOptions': 15},
}
(PUBLIC / 'verificacion-entrega.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2), encoding='utf-8')

# Recortes exactos para excluir pestañas, marcadores, perfil del navegador y DevTools.
def crop(source, name, box):
    image = PILImage.open(SHOTS / (source + '.png')).convert('RGB')
    scale = image.width / 1280
    assert abs(image.height / scale - 752) < 3, 'Revisar dimensiones de captura: ' + source
    target = ASSETS / (name + '.png')
    image.crop(tuple(round(value * scale) for value in box)).save(target, optimize=True)
    return target

fig = {
    'employeeNav': crop('05-panel-empleado', 'menu-empleado', (5,116,1273,176)),
    'adminNav': crop('10-panel-admin', 'menu-administrador', (5,116,1273,176)),
    'register': crop('02-registro', 'registro', (411,280,861,747)),
    'registerButton': crop('03-registro-final', 'boton-registro', (450,574,824,623)),
    'login': crop('04-login', 'ingreso', (416,175,863,688)),
    'profile': crop('09-perfil', 'perfil-empleado', (211,200,1062,576)),
    'documents': crop('07-documento-guardado', 'documentos', (82,175,1195,726)),
    'requests': crop('08-solicitudes-empleado', 'solicitud-empleado', (82,200,1195,695)),
    'directory': crop('11-empleados', 'directorio', (25,195,1247,722)),
    'edit': crop('12-editar-empleado', 'edicion-campos', (380,158,892,728)),
    'status': crop('13-estado-empleado', 'edicion-estado', (380,158,892,728)),
    'review': crop('14-solicitudes-admin', 'solicitud-administrador', (81,482,1190,724)),
    'mobileForm': crop('15-movil-solicitudes', 'movil-formulario', (163,181,563,729)),
    'mobileTable': crop('17-movil-tabla-acciones', 'movil-tabla', (163,181,563,729)),
}

NAVY, TEAL, INK = [colors.HexColor(value) for value in ['#142c45','#087f80','#26374a']]
PAGE = landscape(A4)
WIDTH = PAGE[0] - 28 * mm
pdfmetrics.registerFont(TTFont('Segoe','C:/Windows/Fonts/segoeui.ttf'))
pdfmetrics.registerFont(TTFont('SegoeBold','C:/Windows/Fonts/segoeuib.ttf'))
pdfmetrics.registerFontFamily('Segoe', normal='Segoe', bold='SegoeBold')
st = getSampleStyleSheet()
st['BodyText'].fontName='Segoe'; st['BodyText'].fontSize=9.5; st['BodyText'].leading=14; st['BodyText'].textColor=INK
st.add(ParagraphStyle(name='TitleS', fontName='SegoeBold', fontSize=27, leading=32, textColor=NAVY, spaceAfter=12))
st.add(ParagraphStyle(name='HeadS', fontName='SegoeBold', fontSize=18, leading=23, textColor=TEAL, spaceAfter=9))
st.add(ParagraphStyle(name='SubS', fontName='SegoeBold', fontSize=11, leading=15, textColor=NAVY, spaceBefore=7, spaceAfter=6))
st.add(ParagraphStyle(name='SmallS', fontName='Segoe', fontSize=8.2, leading=11.5, textColor=INK))
st.add(ParagraphStyle(name='CellS', fontName='Segoe', fontSize=9, leading=12, textColor=INK))
st.add(ParagraphStyle(name='WhiteS', parent=st['CellS'], fontName='SegoeBold', textColor=colors.white))
def p(text, style='BodyText'): return Paragraph(text, st[style])
def image(name, width):
    file=fig[name]; im=PILImage.open(file)
    return Image(str(file), width=width, height=width*im.height/im.width, hAlign='CENTER')
def table(rows,widths):
    t=Table([[p(escape(str(c)),'WhiteS' if i==0 else 'CellS') for c in row] for i,row in enumerate(rows)], colWidths=widths, repeatRows=1, hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),NAVY),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#eef5f8'),colors.white]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
    return t
def columns(left,right):
    t=Table([[left,right]],colWidths=[WIDTH/2,WIDTH/2],hAlign='LEFT')
    t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5)]))
    return t
def heading(title,subtitle=''):
    result=[p(title,'HeadS')]
    if subtitle: result += [p(subtitle),Spacer(1,6)]
    return result
def chrome(c,doc):
    c.saveState();c.setFillColor(NAVY);c.rect(0,PAGE[1]-14*mm,PAGE[0],14*mm,fill=1,stroke=0)
    c.setFillColor(colors.white);c.setFont('SegoeBold',9);c.drawString(14*mm,PAGE[1]-9*mm,'SESHA APP  /  MANUAL DE USUARIO')
    c.setStrokeColor(TEAL);c.line(14*mm,13*mm,PAGE[0]-14*mm,13*mm)
    c.setFillColor(INK);c.setFont('Segoe',8);c.drawString(14*mm,8*mm,'Proyecto SENA · Capturas reales de Edge · 13/11/2026 · Datos académicos ficticios')
    c.drawRightString(PAGE[0]-14*mm,8*mm,str(doc.page));c.restoreState()

s=[p('Manual breve de usuario','TitleS'),p('Registro, documentos, solicitudes y administración de perfiles laborales.'),Spacer(1,7),
   p('<b>Acceso:</b> <link href="https://sesha-app.vercel.app" color="#087f80">https://sesha-app.vercel.app</link> · <b>Versión de aplicación:</b> '+commit[:12]+' · <b>Fecha:</b> 13 de noviembre de 2026.'),
   p('Solicita al responsable las credenciales académicas. El cargo laboral seleccionado al registrarse no concede permisos de administrador.'),Spacer(1,10),
   table([['Rol','Qué puede hacer'],['Empleado','Consultar su perfil, descargar su constancia, guardar y descargar sus PDF, crear solicitudes y consultar su estado.'],['Administrador','Consultar todos los documentos y solicitudes; gestionar perfiles laborales; aprobar o rechazar solicitudes.']], [WIDTH*.18,WIDTH*.82]),
   p('Menú de empleado','SubS'),image('employeeNav',WIDTH),p('Menú de administrador','SubS'),image('adminNav',WIDTH),Spacer(1,8),
   p('Este manual describe las funciones disponibles. Los ejemplos de documento y solicitud se crearon para la revisión y se retiraron después. La base conserva 152 perfiles y el registro ofrece 15 cargos. Las capturas excluyen controles y datos personales del navegador.','SmallS')]

s += [PageBreak()]+heading('1. Crear una cuenta e ingresar','El registro prepara una cuenta de empleado y su perfil laboral. No necesitas seleccionar un rol de acceso.')
s += [columns(
    [p('Registro','SubS'),image('register',280),Spacer(1,5),image('registerButton',235),p('1. Escribe nombre y correo. 2. Selecciona un cargo. 3. Introduce y confirma la contraseña. 4. Desplázate al final y pulsa <b>Registrarse</b>.','SmallS')],
    [p('Inicio de sesión','SubS'),image('login',280),p('Introduce correo y contraseña y pulsa <b>Entrar al sistema</b>. Tras ingresar se muestra el panel correspondiente a tus permisos. Para salir usa <b>Cerrar sesión</b>.','SmallS')]),
    p('El correo es único. Las contraseñas deben tener al menos 6 caracteres y un máximo de 72 bytes. La selección de un cargo administrativo tampoco convierte la cuenta en administradora. Durante esta revisión visual no se creó otra cuenta en la base publicada.','SmallS')]

s += [PageBreak()]+heading('2. Consultar el perfil y obtener la constancia','Desde el menú, abre Mi perfil. Revisa documento, cargo, departamento, estado y fecha de ingreso.')
s += [image('profile',710),Spacer(1,10),
      p('En la sección <b>Constancia laboral</b>, pulsa <b>Descargar constancia laboral</b>. También está disponible en Documentos. El archivo contiene los datos del perfil y la fecha de expedición actual.'),
      p('La constancia se descargó desde Edge durante la revisión. Si un dato laboral es incorrecto, solicita su corrección al administrador; el perfil no ofrece autoedición al empleado.','SmallS')]

s += [PageBreak()]+heading('3. Guardar y descargar documentos PDF','Abre Documentos. Cada archivo debe ser un PDF válido de hasta 3 MiB (3.145.728 bytes).')
s += [image('documents',735),Spacer(1,8),
      p('<b>Cargar:</b> Elegir archivo → seleccionar el PDF → Guardar documento. <b>Descargar:</b> usa Descargar junto al archivo. <b>Eliminar:</b> retira un documento que no esté vinculado a una solicitud.'),
      p('No hay edición o reemplazo directo del PDF. La carga de la muestra se verificó por API y su descarga conservó todos los bytes. El selector nativo de archivos no pudo completarse con la herramienta de control de Edge; esa limitación no se presenta como una carga hecha por la interfaz.','SmallS')]

s += [PageBreak()]+heading('4. Radicar una solicitud como empleado','Abre Solicitudes. Los tipos disponibles son Permiso, Vacaciones y Certificado.')
s += [image('requests',735),Spacer(1,8),
      p('1. Selecciona el tipo y escribe el motivo. 2. Adjunta un PDF si necesitas soporte. 3. Pulsa <b>Enviar solicitud</b>. Consulta el resultado en el historial; inicialmente queda <b>Pendiente</b>.'),
      p('El motivo admite entre 3 y 2.000 caracteres. El empleado consulta sus propias solicitudes y puede eliminar las pendientes. Las aprobadas o rechazadas conservan la decisión del administrador. El soporte vinculado no se puede borrar mientras exista esa relación.','SmallS')]

s += [PageBreak()]+heading('5. Administrar el directorio de empleados','Disponible únicamente para el rol administrador. El listado está paginado; la búsqueda filtra la página actual.')
s += [image('directory',735),Spacer(1,8),
      p('<b>Crear un perfil:</b> Nuevo empleado → completar datos laborales → Guardar. Para asociarlo a una cuenta, esa cuenta debe estar registrada previamente; el correo es opcional para personal sin cuenta.'),
      p('<b>Actualizar:</b> usa Editar en la fila del perfil existente. Una cuenta recién registrada ya tiene un perfil: edítalo en lugar de crear otro con el mismo correo o documento.','SmallS')]

s += [PageBreak()]+heading('6. Editar datos e inactivar un perfil','Las dos capturas muestran el mismo formulario antes y después de desplazarse dentro de él.')
s += [columns([p('Campos principales','SubS'),image('edit',300)],[p('Fecha, estado y guardado','SubS'),image('status',300)]),Spacer(1,8),
      p('Corrige los campos necesarios. Para la baja lógica cambia <b>Estado</b> a <b>Inactivo</b> y guarda; para reactivar, vuelve a <b>Activo</b>. La fecha de ingreso debe ser válida y no futura.'),
      p('No existe eliminación definitiva de perfiles en esta interfaz. El estado laboral no equivale a cambiar el rol de acceso ni a gestionar la contraseña de la cuenta. En esta revisión se inspeccionó el formulario y se canceló sin modificar perfiles existentes.','SmallS')]

s += [PageBreak()]+heading('7. Revisar solicitudes como administrador','El administrador consulta el conjunto de solicitudes y puede descargar sus soportes.')
s += [image('review',735),Spacer(1,10),
      p('En <b>Estado</b>, selecciona <b>Aprobado</b>, <b>Rechazado</b> o <b>Pendiente</b>. La selección se guarda automáticamente. El administrador también puede eliminar solicitudes.'),Spacer(1,8),
      table([['Operación','Empleado','Administrador'],['Documentos','Propios','Consulta y gestión de todos'],['Solicitudes','Propias; elimina las pendientes','Consulta todas; decide estado y elimina'],['Perfiles laborales','Consulta su perfil','Crea, consulta, edita e inactiva'],['Roles y contraseñas de cuentas','No se administran desde estos módulos','No hay un panel de gestión de roles o contraseñas']], [WIDTH*.24,WIDTH*.36,WIDTH*.40]),
      p('La solicitud ilustrada es una prueba académica, creada por API y eliminada tras capturar la pantalla. No corresponde a un trámite real.','SmallS')]

s += [PageBreak()]+heading('8. Usar la aplicación en una pantalla pequeña','Revisión en la emulación adaptable de Edge: 400 × 547 píxeles CSS, sin simular limitaciones de red.')
s += [columns([image('mobileForm',250),p('El menú se distribuye en varias filas y el formulario mantiene sus controles dentro del ancho disponible. Desplázate verticalmente para llegar al botón de envío.','SmallS')],
              [image('mobileTable',250),p('En el directorio, desplaza la tabla horizontalmente para ver las columnas de la derecha y llegar a Editar. Esta acción se comprobó durante la revisión.','SmallS')]),
      p('Se revisaron el formulario de solicitudes y el directorio en ese tamaño. No se probó un teléfono físico, todos los tamaños de pantalla ni todos los navegadores.','SmallS')]

checks=backup['checks']
s += [PageBreak()]+heading('9. Respaldo, verificación y cierre de la entrega','Respaldo privado de todas las colecciones de proyecto_sena; restauración comprobada en MongoDB temporal local.')
s += [table([['Colección','Documentos','Índices','Comparación restaurada']]+[[item['collection'],item['documents'],item['indexes'],'Coincide'] for item in checks], [WIDTH*.34,WIDTH*.16,WIDTH*.16,WIDTH*.34]),Spacer(1,10),
      p(f"<b>Resultado:</b> {sum(item['documents'] for item in checks)} documentos y {sum(item['indexes'] for item in checks)} índices comprobados. El origen se consultó sin escrituras y no cambió durante la exportación. El archivo comprimido ocupa {backup['archiveBytes']:,} bytes."),
      p('El respaldo se conserva en <b>.qa/backups/&lt;fecha&gt;/proyecto_sena.archive.gz</b>, excluido de Git y Vercel. La ruta concreta está en <b>.qa/latest-backup.json</b>. Con las herramientas oficiales instaladas, <b>node qa/backup-and-verify.cjs</b> crea otro respaldo y verifica su restauración exclusivamente local.'),
      p('Este respaldo cubre los datos y los índices de la aplicación. No incluye usuarios de Atlas, claves, configuración de red ni recuperación a un instante mediante oplog. Conserva una segunda copia privada fuera de la carpeta del proyecto; nunca publiques el archivo en Pages.','SmallS'),
      p('Verificación final','SubS'),
      p('Las cuentas y los 152 perfiles se conservaron. El PDF y la solicitud de prueba se eliminaron; quedaron cero documentos y cero solicitudes, como antes de la revisión. La aplicación permaneció disponible. El resumen público contiene conteos y comprobaciones, sin contraseñas, URI ni el contenido del respaldo.','SmallS'),
      p('<link href="https://alexriver101219.github.io/PROYECTO_SENA/" color="#087f80">Portal de informes y manual</link> · <link href="https://www.mongodb.com/docs/database-tools/mongodump/" color="#087f80">mongodump</link> · <link href="https://www.mongodb.com/docs/database-tools/mongorestore/" color="#087f80">mongorestore</link>','SmallS')]

target=ROOT/'output/pdf/manual-usuario-sesha.pdf'
SimpleDocTemplate(str(target),pagesize=PAGE,leftMargin=14*mm,rightMargin=14*mm,topMargin=22*mm,bottomMargin=18*mm,title='SESHA APP - Manual breve de usuario',author='Proyecto SENA').build(s,onFirstPage=chrome,onLaterPages=chrome)
reader=PdfReader(target)
text='\n'.join(page.extract_text() or '' for page in reader.pages)
assert all(len(page.extract_text() or '')>100 for page in reader.pages)
assert not re.search(r'mongodb\+srv://|sesha_session=|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',text)
shutil.copy2(target,PUBLIC/target.name)
print(json.dumps({'pdf':target.name,'pages':len(reader.pages),'bytes':target.stat().st_size,'croppedImages':len(fig)}))
