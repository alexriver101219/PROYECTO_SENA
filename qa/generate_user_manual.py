"""Manual ilustrado: conserva la evidencia anterior y añade el cambio de clave."""
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
CURRENT_SHOTS = ROOT / '.qa/handbook-2026-11-14'
PUBLIC = ROOT / 'docs/manual/2026-11-14'
ASSETS = PUBLIC / 'capturas'
ASSETS.mkdir(parents=True, exist_ok=True)
backup = json.loads((ROOT / '.qa/latest-backup.json').read_text(encoding='utf-8'))['result']
fixture = json.loads((SHOTS / 'revision-fixtures.json').read_text(encoding='utf-8'))
assert backup['passed'] and fixture['cleaned'] and fixture['bytesMatch']
assert fixture['final'] == {'documents': 0, 'requests': 0}
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
release_check = ROOT / '.qa/remediation-2026-11-14/production-verification.json'
publication = json.loads(release_check.read_text(encoding='utf-8')) if release_check.exists() else {}
release_metadata = ROOT / '.qa/remediation-2026-11-14/production-release.json'
release = json.loads(release_metadata.read_text(encoding='utf-8')) if release_metadata.exists() else {}
published = release.get('state') == 'READY' and publication.get('target') == 'https://sesha-app.vercel.app' and publication.get('passed') == 12 and publication.get('failed') == 0
proof = {
    'project': 'SESHA APP', 'date': '2026-11-14', 'timezone': 'America/Bogota',
    'baselineEvidenceDate': '2026-11-13', 'applicationChangesPublished': published,
    'applicationCommit': commit, 'target': 'https://sesha-app.vercel.app',
    'presentationUpdate': {'baseCommit': commit, 'workingTreeRevision': not published, 'revisedScreenshots': ['Ingreso con botón Cambiar contraseña', 'Formulario de cambio de contraseña'], 'scope': ('Producción verificada el 14/11/2026. ' if published else 'Revisión local pendiente de publicar. ') + 'Capturas de acceso del 14/11/2026 y referencias de otros módulos del 13/11/2026; alta administrativa descrita en texto. Respaldo verificado el 14/11/2026.'},
    'backup': {key: backup[key] for key in ['startedAt', 'completedAt', 'sourceDatabase', 'sourceVersion', 'toolsVersion', 'archiveBytes', 'archiveSha256', 'restoreTarget', 'sourceReadOnly', 'changedDuringDump', 'checks', 'passed', 'scope']},
    'visualReview': {
        'reviewDate': '2026-11-13',
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
    'passwordChangeUpdate': {
        'date': '2026-11-14', 'environment': 'Local, MongoDB temporal aislado',
        'browser': 'Microsoft Edge InPrivate, control nativo de Windows',
        'screenshots': ['Login con botón de cambio', 'Formulario con campos vacíos'],
        'credentialsEnteredForDocumentation': False, 'productionAccountsChangedForDocumentation': False,
        'backendTestsPassed': 48, 'frontendTestsPassed': 19,
        'passwordMinimumCharacters': 12, 'passwordMaximumUtf8Bytes': 72,
        'requiresCurrentPassword': True, 'previousSessionsRevokedOnSuccess': True,
        'deploymentPending': not published,
    },
}
if published:
    proof['productionVerification'] = release
    proof['applicationCommit'] = release['commit']
for space, field in [('backend', 'backendTestsPassed'), ('frontend', 'frontendTestsPassed')]:
    test_report = ROOT / f'.qa/remediation-2026-11-14/{space}-vitest.json'
    if test_report.exists():
        result = json.loads(test_report.read_text(encoding='utf-8'))
        assert result['numFailedTests'] == 0
        proof['passwordChangeUpdate'][field] = result['numPassedTests']
(PUBLIC / 'verificacion-entrega.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2), encoding='utf-8')

# Recortes exactos para excluir pestañas, marcadores, perfil del navegador y DevTools.
def crop(source, name, box, source_dir=SHOTS, expected_height=752):
    source_path = source_dir / (source + '.png')
    if not source_path.exists():
        source_path = source_dir / (source + '.jpg')
    image = PILImage.open(source_path).convert('RGB')
    scale = image.width / 1280
    assert abs(image.height / scale - expected_height) < 3, 'Revisar dimensiones de captura: ' + source
    target = ASSETS / (name + '.png')
    image.crop(tuple(round(value * scale) for value in box)).save(target, optimize=True)
    return target

fig = {
    'employeeNav': crop('05-panel-empleado', 'menu-empleado', (5,116,1273,176)),
    'adminNav': crop('10-panel-admin-v2', 'menu-administrador', (5,116,1273,350)),
    'register': crop('02-registro', 'registro', (411,280,861,747)),
    'registerButton': crop('03-registro-final', 'boton-registro', (450,574,824,623)),
    'login': crop('01-ingreso', 'ingreso', (440,222,839,635), CURRENT_SHOTS),
    'passwordChange': crop('02-cambio-clave', 'cambio-contrasena', (432,147,839,735), CURRENT_SHOTS, expected_height=800),
    'profile': crop('09-perfil', 'perfil-empleado', (211,200,1062,576)),
    'documents': crop('07-documento-guardado', 'documentos', (82,175,1195,726)),
    'requests': crop('08-solicitudes-empleado', 'solicitud-empleado', (82,200,1195,695)),
    'directory': crop('11-empleados', 'directorio', (25,195,1247,722)),
    'edit': crop('12-editar-empleado', 'edicion-campos', (380,158,892,728)),
    'status': crop('13-estado-empleado', 'edicion-estado', (380,158,892,728)),
    'review': crop('14-solicitudes-admin-v2', 'solicitud-administrador', (81,482,1190,724)),
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
    c.setFillColor(INK);c.setFont('Segoe',8);c.drawString(14*mm,8*mm,'SESHA APP · Capturas reales de Edge · Revisión local 14/11/2026')
    c.drawRightString(PAGE[0]-14*mm,8*mm,str(doc.page));c.restoreState()

s=[p('Manual breve de usuario','TitleS'),p('Registro, cambio de contraseña, documentos, solicitudes y perfiles laborales.'),Spacer(1,7),
   p('<b>Acceso publicado:</b> <link href="https://sesha-app.vercel.app" color="#087f80">https://sesha-app.vercel.app</link> · <b>Revisión:</b> 14 de noviembre de 2026.'),
   p('Solicita al responsable tus credenciales de acceso. El cargo laboral seleccionado al registrarse no concede permisos de administrador.'),Spacer(1,10),
   table([['Rol','Qué puede hacer'],['Empleado','Consultar su perfil, descargar su constancia, guardar y descargar sus PDF, crear solicitudes y consultar su estado.'],['Administrador','Consultar todos los documentos y solicitudes; gestionar perfiles laborales; aprobar o rechazar solicitudes.']], [WIDTH*.18,WIDTH*.82]),
   p('Menú de empleado','SubS'),image('employeeNav',WIDTH),p('Panel y menú del administrador','SubS'),image('adminNav',WIDTH),Spacer(1,8),
   p('Versión preparada para producción: el registro público está cerrado; las cuentas se crean desde el panel del administrador. Capturas de acceso del 14/11/2026; las demás imágenes son de referencia del 13/11/2026. El respaldo se volvió a verificar el 14/11/2026. Las capturas históricas no incluyen los nuevos campos del alta administrativa.','SmallS')]

s += [PageBreak()]+heading('1. Obtener una cuenta e ingresar','En producción, el administrador verifica tus datos laborales y crea tu cuenta. El registro público está cerrado.')
s += [columns(
    [p('Alta por el administrador','SubS'),p('<b>1.</b> Solicita tu acceso por el canal interno de la empresa.'),p('<b>2.</b> El administrador abre <b>Empleados → Nuevo empleado</b> e introduce nombre, documento, cargo, departamento y fecha real de ingreso.'),p('<b>3.</b> Para crear acceso, indica tu correo y marca <b>Crear también su cuenta de acceso</b>.'),p('<b>4.</b> Introduce una contraseña inicial de al menos 12 caracteres y máximo 72 bytes; el campo aparece enmascarado. Pulsa <b>Guardar</b>.'),p('<b>5.</b> Recibe tus credenciales por un canal privado. Cambia la contraseña inicial desde el login antes de usar la cuenta.'),p('Si visitas Registrarse en producción, la pantalla indica que solicites la cuenta al administrador. No se generan documentos o fechas laborales ficticias.','SmallS')],
    [p('Inicio de sesión','SubS'),image('login',250),p('Introduce correo y contraseña y pulsa <b>Entrar al sistema</b>. El botón <b>Cambiar contraseña</b> abre el procedimiento de la página siguiente. Para salir de una sesión usa <b>Cerrar sesión</b>.','SmallS')]),
    p('El correo y el documento son únicos. Dos personas pueden tener el mismo nombre: deben usar documentos y correos diferentes. El alta administrativa crea una cuenta de empleado y su perfil juntos; un cargo administrativo no concede permisos de administrador.','SmallS')]

s += [PageBreak()]+heading('1.1. Cambiar la contraseña de acceso')
s += [columns(
    [p('Desde Iniciar sesión, pulsa <b>Cambiar contraseña</b>, debajo de Entrar al sistema.','SmallS'),
     p('Actualiza tu acceso en cinco pasos','SubS'),
     p('<b>1.</b> Escribe el correo de tu cuenta.'),
     p('<b>2.</b> Introduce tu <b>Contraseña actual</b>. Es necesaria para confirmar que puedes modificar esa cuenta.'),
     p('<b>3.</b> Escribe una <b>Nueva contraseña</b>, diferente de la actual: al menos <b>12 caracteres</b> y máximo <b>72 bytes UTF-8</b>. No uses saltos de línea ni caracteres de control.'),
     p('<b>4.</b> Repite exactamente la clave en <b>Confirmar nueva contraseña</b>.'),
     p('<b>5.</b> Pulsa <b>Guardar nueva contraseña</b> y espera la confirmación de éxito.'),
     p('Después de guardar','SubS'),
     p('Se cierran las sesiones anteriores de esa cuenta. La pantalla vuelve al login: entra con tu nueva contraseña.'),
     p('Si necesitas corregir la entrada','SubS'),
     p('Las claves aparecen enmascaradas. Si hay un error, corrígelo antes de volver a guardar. La confirmación debe coincidir; tildes y emojis pueden ocupar más de un byte. Si cancelas con <b>Volver a iniciar sesión</b>, no se guarda un cambio.'),
     p('Si olvidaste la clave actual, solicita ayuda al responsable. Esta opción no recupera contraseñas por correo ni permite cambiar las de otras personas. No compartas claves en chats o capturas.','SmallS')],
    [image('passwordChange',270),Spacer(1,5),p('Captura local del formulario vacío, 14/11/2026. No se introdujeron credenciales ni se modificaron cuentas para elaborar el manual.','SmallS')])]

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
      p('<b>Crear un perfil:</b> Nuevo empleado → completar datos verificados → Guardar. Para crear también el acceso, indica el correo, marca <b>Crear también su cuenta de acceso</b> e introduce una contraseña inicial oculta. Si la cuenta ya existe, deja esa opción desmarcada. El correo es opcional para personal sin acceso.'),
      p('<b>Actualizar:</b> usa Editar en la fila existente. No crees otro perfil para la misma cuenta o documento. Las imágenes son de referencia anterior; la opción de crear cuenta se añadió en la revisión de producción.','SmallS')]

s += [PageBreak()]+heading('6. Editar datos e inactivar un perfil','Las dos capturas muestran el mismo formulario antes y después de desplazarse dentro de él.')
s += [columns([p('Campos principales','SubS'),image('edit',300)],[p('Fecha, estado y guardado','SubS'),image('status',300)]),Spacer(1,8),
      p('Corrige los campos necesarios. Para la baja lógica cambia <b>Estado</b> a <b>Inactivo</b> y guarda; para reactivar, vuelve a <b>Activo</b>. La fecha de ingreso debe ser válida y no futura.'),
      p('No existe eliminación definitiva de perfiles en esta interfaz. El estado laboral no equivale a cambiar el rol de acceso ni a gestionar la contraseña de la cuenta. En esta revisión se inspeccionó el formulario y se canceló sin modificar perfiles existentes.','SmallS')]

s += [PageBreak()]+heading('7. Revisar solicitudes como administrador','El administrador consulta el conjunto de solicitudes y puede descargar sus soportes.')
s += [image('review',735),Spacer(1,10),
      p('En <b>Estado</b>, selecciona <b>Aprobado</b>, <b>Rechazado</b> o <b>Pendiente</b>. La selección se guarda automáticamente. El administrador también puede eliminar solicitudes.'),Spacer(1,8),
      table([['Operación','Empleado','Administrador'],['Documentos','Propios','Consulta y gestión de todos'],['Solicitudes','Propias; elimina las pendientes','Consulta todas; decide estado y elimina'],['Perfiles laborales','Consulta su perfil','Crea, consulta, edita e inactiva'],['Contraseña de su cuenta','Cambio desde el login, con clave actual','Mismo procedimiento para su propia cuenta'],['Roles de acceso','No se administran desde estos módulos','No hay un panel de gestión de roles']], [WIDTH*.24,WIDTH*.36,WIDTH*.40]),
      p('La solicitud ilustrada es un ejemplo de prueba, creado por API y eliminado tras capturar la pantalla. No corresponde a un trámite real.','SmallS')]

s += [PageBreak()]+heading('8. Usar la aplicación en una pantalla pequeña','Revisión en la emulación adaptable de Edge: 400 × 547 píxeles CSS, sin simular limitaciones de red.')
s += [columns([image('mobileForm',250),p('El menú se distribuye en varias filas y el formulario mantiene sus controles dentro del ancho disponible. Desplázate verticalmente para llegar al botón de envío.','SmallS')],
              [image('mobileTable',250),p('En el directorio, desplaza la tabla horizontalmente para ver las columnas de la derecha y llegar a Editar. Esta acción se comprobó durante la revisión.','SmallS')]),
      p('Se revisaron el formulario de solicitudes y el directorio en ese tamaño. No se probó un teléfono físico, todos los tamaños de pantalla ni todos los navegadores.','SmallS')]

checks=backup['checks']
s += [PageBreak()]+heading('9. Respaldo y verificación de referencia','Evidencia del 14/11/2026: respaldo actualizado de proyecto_sena restaurado exclusivamente en MongoDB temporal local, antes de la cuarentena adicional autorizada.')
s += [table([['Colección','Documentos','Índices','Comparación restaurada']]+[[item['collection'],item['documents'],item['indexes'],'Coincide'] for item in checks], [WIDTH*.34,WIDTH*.16,WIDTH*.16,WIDTH*.34]),Spacer(1,10),
      p(f"<b>Resultado:</b> {sum(item['documents'] for item in checks)} documentos y {sum(item['indexes'] for item in checks)} índices comprobados. El origen se consultó sin escrituras y no cambió durante la exportación. El archivo comprimido ocupa {backup['archiveBytes']:,} bytes."),
      p('El respaldo se conserva en <b>.qa/backups/&lt;fecha&gt;/proyecto_sena.archive.gz</b>, excluido de Git y Vercel. La ruta concreta está en <b>.qa/latest-backup.json</b>. Con las herramientas oficiales instaladas, <b>node qa/backup-and-verify.cjs</b> crea otro respaldo y verifica su restauración exclusivamente local.'),
      p('Este respaldo cubre los datos y los índices de la aplicación. No incluye usuarios de Atlas, claves, configuración de red ni recuperación a un instante mediante oplog. Conserva una segunda copia privada fuera de la carpeta del proyecto; nunca publiques el archivo en Pages.','SmallS'),
      p('Verificación final','SubS'),
      p('La revisión de seguridad del 14/11/2026 desactivó 120 cuentas demo y, con otra autorización específica, 19 empleados adicionales con claves expuestas. Revocó sus sesiones y conservó cuentas, roles, perfiles y documentos. No se debe reactivar una cuenta afectada sin sustituir primero su clave mediante un procedimiento autorizado. El cambio del secreto de sesiones exige volver a iniciar sesión. El resumen público excluye secretos y el contenido del respaldo.','SmallS'),
      p('<link href="https://alexriver101219.github.io/PROYECTO_SENA/" color="#087f80">Portal de informes y manual</link> · <link href="https://www.mongodb.com/docs/database-tools/mongodump/" color="#087f80">mongodump</link> · <link href="https://www.mongodb.com/docs/database-tools/mongorestore/" color="#087f80">mongorestore</link>','SmallS')]

target=ROOT/'output/pdf/manual-usuario-sesha.pdf'
SimpleDocTemplate(str(target),pagesize=PAGE,leftMargin=14*mm,rightMargin=14*mm,topMargin=22*mm,bottomMargin=18*mm,title='SESHA APP - Manual breve de usuario',author='SESHA APP').build(s,onFirstPage=chrome,onLaterPages=chrome)
reader=PdfReader(target)
text='\n'.join(page.extract_text() or '' for page in reader.pages)
assert all(len(page.extract_text() or '')>100 for page in reader.pages)
assert len(reader.pages) == 11
assert all(value in text for value in ['Cambiar contraseña', '12 caracteres', '72 bytes', 'Guardar nueva contraseña', 'Contraseña actual'])
assert not re.search(r'acad[eé]mic', text, re.IGNORECASE)
assert not re.search(r'mongodb\+srv://|sesha_session=|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',text)
shutil.copy2(target,PUBLIC/target.name)
print(json.dumps({'pdf':target.name,'pages':len(reader.pages),'bytes':target.stat().st_size,'croppedImages':len(fig)}))
