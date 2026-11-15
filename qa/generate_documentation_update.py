"""Edición documental 15/11/2026. No lee contraseñas, sesiones ni .env."""
import hashlib
import io
import json
from datetime import datetime, timezone
import re
import shutil
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image as PILImage
from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak

ROOT = Path(__file__).resolve().parent.parent
DATE = '2026-11-15'
OUT = ROOT / 'output/pdf'
MANUAL = ROOT / 'docs/manual' / DATE
TECH = ROOT / 'docs/informes' / DATE
EVIDENCE = ROOT / 'docs/actualizaciones' / DATE
RENDER = ROOT / '.qa/documentation-2026-11-15'
for directory in [OUT, MANUAL, TECH, EVIDENCE, RENDER]:
    directory.mkdir(parents=True, exist_ok=True)

def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))

release = read('.qa/requests-release-verification.json')
payroll = read('.qa/payroll-release-verification.json')
accounts = read('.qa/access-accounts-complete-2026-11-15/verification.json')
account_changes = read('.qa/access-accounts-complete-2026-11-15/applied.json')
campaign = read('docs/pruebas/2026-11-15/resultados.json')
remote_campaign = read('docs/pruebas/2026-11-15/zap-vercel-resultados.json')
FC, PERF, ZS = campaign['functional'], campaign['performance'], campaign['security']
TOTAL = FC['total']
APP_COMMIT = campaign['source']['commit']
APP_DEPLOYMENT = remote_campaign['deployment']['id']
stable = PERF['sustained']
def risks(section):
    counts = section['riskCounts']
    return f"{counts['high']} altas, {counts['medium']} medias, {counts['low']} bajas y {counts['informational']} informativas"
capacity = f"{stable['targetRps']} solicitudes/s durante 60 s, p95 {stable['p95Ms']:.1f} ms" if stable else 'Sin capacidad sostenida confirmada'
assert all(release[key] is True for key in ['frontendMatchesTestedBuild', 'ownProfile', 'forgedIdentityRejected', 'missingDateRejected',
    'datedLeaveSavedAndReloaded', 'payrollAdjustmentSavedWithNullDate', 'optionalSupportSavedAndDownloaded', 'referencedSupportDeletionBlocked', 'temporaryRecordsRemoved'])
assert accounts['totalAccounts'] == accounts['activeAccounts'] == 152
assert accounts['employeeAccesses'] == accounts['passwordsVerified'] == 151
assert account_changes['adminAccessUnchanged']

# Publicar únicamente evidencias agregadas y verificaciones sin datos personales.
proof = {
    'date': DATE, 'revision': 'Campaña completa de pruebas repetidas', 'generatedAt': datetime.now(timezone.utc).isoformat(),
    'timezone': 'America/Bogota', 'applicationCommit': APP_COMMIT,
    'target': release['site'], 'deployment': APP_DEPLOYMENT, 'applicationChangesPublished': True,
    'requests': {key: release[key] for key in ['verifiedAt', 'requestTypes', 'ownProfile', 'forgedIdentityRejected', 'missingDateRejected',
        'datedLeaveSavedAndReloaded', 'payrollAdjustmentSavedWithNullDate', 'optionalSupportSavedAndDownloaded', 'referencedSupportDeletionBlocked', 'temporaryRecordsRemoved']},
    'payroll': {'verifiedAt': payroll['verifiedAt'], 'commit': payroll['commit'], 'liveEmployeeChecks': payroll['liveEmployeeChecks'],
        'employeePositionCoverage': payroll['employeePositionCoverage'], 'pdfVisualCheck': payroll['pdfVisualCheck'], 'githubCI': payroll['githubCI']},
    'accountMaintenance': {'verifiedAt': accounts['completedAt'], 'totalAccounts': accounts['totalAccounts'], 'activeAccounts': accounts['activeAccounts'],
        'employeeAccesses': accounts['employeeAccesses'], 'passwordsVerified': accounts['passwordsVerified'], 'uniqueDocuments': accounts['uniqueDocuments'],
        'adminAccessUnchanged': account_changes['adminAccessUnchanged']},
    'localTests': {'backend': FC['backend']['passed'], 'frontend': FC['frontend']['passed'], 'http': FC['http']['passed'], 'total': TOTAL, 'failed': FC['failed'],
        'commands': ['cd backend: vitest run', 'cd Style/login_app: vitest run', 'node qa/functional-http.cjs'],
        'scope': 'Suites completas repetidas en esta campaña. Incluye mantenimiento aislado. Los intentos iniciales se conservan separadamente; no se suman a las campañas anteriores.'},
    'currentCampaign': {'results': '../../pruebas/2026-11-15/resultados.json', 'remoteResults': '../../pruebas/2026-11-15/zap-vercel-resultados.json',
        'sustainedRps': stable['targetRps'] if stable else None, 'k6FailedStages': sum(not item['passed'] for item in PERF['runs']),
        'localRisks': ZS['riskCounts'], 'vercelRisks': remote_campaign['riskCounts'], 'previousAttempts': FC.get('previousAttempts', [])},
    'currentBrowserVisualCheck': {'completed': False, 'reason': 'La herramienta de control no admite la política de URL del navegador Windows disponible.'},
    'illustrations': {'historicalScreenshots': 'Login y cambio de contraseña: 14/11/2026. Formulario vacío.',
        'currentForms': 'Tablas y diagramas explicativos del manual; no se presentan como capturas actuales.'},
    'historicalEvidence': {'previousReportDate': '2026-11-14', 'reportDate': DATE, 'newK6Run': True, 'newZAPRun': True, 'newBackupRun': False},
    'publicContent': 'Sin contraseñas, tokens, correos de empleados, documentos personales ni respaldos.'
}
(EVIDENCE / 'verificacion.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

NAVY, TEAL, INK, PALE = [colors.HexColor(value) for value in ['#142c45', '#087f80', '#26374a', '#eef5f8']]
pdfmetrics.registerFont(TTFont('Segoe', 'C:/Windows/Fonts/segoeui.ttf'))
pdfmetrics.registerFont(TTFont('SegoeBold', 'C:/Windows/Fonts/segoeuib.ttf'))
pdfmetrics.registerFontFamily('Segoe', normal='Segoe', bold='SegoeBold')
ST = getSampleStyleSheet()
ST['BodyText'].fontName = 'Segoe'; ST['BodyText'].fontSize = 10; ST['BodyText'].leading = 15
ST['BodyText'].textColor = INK; ST['BodyText'].spaceAfter = 8
ST.add(ParagraphStyle(name='TitleS', fontName='SegoeBold', fontSize=28, leading=34, textColor=NAVY, spaceAfter=15))
ST.add(ParagraphStyle(name='HeadS', fontName='SegoeBold', fontSize=19, leading=25, textColor=TEAL, spaceAfter=12))
ST.add(ParagraphStyle(name='SubS', fontName='SegoeBold', fontSize=12, leading=17, textColor=NAVY, spaceBefore=9, spaceAfter=7))
ST.add(ParagraphStyle(name='CellS', fontName='Segoe', fontSize=9, leading=13, textColor=INK))
ST.add(ParagraphStyle(name='WhiteS', parent=ST['CellS'], fontName='SegoeBold', textColor=colors.white))
ST.add(ParagraphStyle(name='SmallS', fontName='Segoe', fontSize=8.5, leading=12.5, textColor=INK, spaceAfter=7))
ST.add(ParagraphStyle(name='RefS', parent=ST['SmallS'], leftIndent=15, firstLineIndent=-15, spaceAfter=12))

def p(text, style='BodyText'):
    return Paragraph(text, ST[style])

def table(rows, widths, padding=8):
    result = Table([[p(escape(str(cell)), 'WhiteS' if index == 0 else 'CellS') for cell in row] for index, row in enumerate(rows)],
        colWidths=widths, repeatRows=1, hAlign='LEFT')
    result.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), NAVY), ('ROWBACKGROUNDS', (0, 1), (-1, -1), [PALE, colors.white]),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 9), ('RIGHTPADDING', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), padding), ('BOTTOMPADDING', (0, 0), (-1, -1), padding)]))
    return result

def columns(left, right, width):
    result = Table([[left, right]], colWidths=[width * .51, width * .49])
    result.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 14)]))
    return result

def figure(path, width):
    picture = PILImage.open(path)
    return Image(str(path), width=width, height=width * picture.height / picture.width, hAlign='CENTER')

LOGO = ROOT / 'backend/assets/sesha-logo.png'
HEADER_LOGO = RENDER / 'sesha-encabezado.png'
historical = PdfReader(ROOT / 'docs/informes/2026-11-14/informe-tecnico-consolidado-sesha.pdf')
# Se reutiliza el logotipo institucional ya contenido en la entrega aprobada.
for image in historical.pages[0].images:
    image.image.save(HEADER_LOGO)
    break
assert HEADER_LOGO.exists(), 'No se encontró el logotipo de la edición anterior'

def chrome(title, pagesize, institutional=False):
    def draw(c, doc):
        w, h = pagesize
        c.saveState(); c.setFillColor(NAVY); c.rect(0, h - 15 * mm, w, 15 * mm, fill=1, stroke=0)
        c.setFillColor(colors.white); c.setFont('SegoeBold', 9); c.drawString(16 * mm, h - 9.5 * mm, 'SESHA APP  /  ' + title)
        if institutional:
            c.drawImage(str(HEADER_LOGO), w - 31 * mm, h - 13 * mm, 13 * mm, 11 * mm, preserveAspectRatio=True, mask='auto')
        c.setStrokeColor(TEAL); c.line(16 * mm, 14 * mm, w - 16 * mm, 14 * mm)
        c.setFillColor(INK); c.setFont('Segoe', 8)
        footer = 'SENA 2026 | Ficha 3186701 | Alexander Rivera Sánchez' if institutional else 'Edición vigente: 15/11/2026 | Empleado y administrador'
        c.drawString(16 * mm, 9 * mm, footer)
        if institutional:
            c.drawImage(str(HEADER_LOGO), w - 38 * mm, 5 * mm, 8 * mm, 7 * mm, preserveAspectRatio=True, mask='auto')
        c.drawRightString(w - 16 * mm, 9 * mm, str(doc.page)); c.restoreState()
    return draw

def build(path, story, size, title, institutional=False):
    draw = chrome(title.upper(), size, institutional)
    SimpleDocTemplate(str(path), pagesize=size, leftMargin=16 * mm, rightMargin=16 * mm,
        topMargin=23 * mm, bottomMargin=20 * mm, title='SESHA APP - ' + title, author='Alexander Rivera Sánchez').build(story, onFirstPage=draw, onLaterPages=draw)

MW = landscape(A4)[0] - 32 * mm
manual = []
def mp(title, items):
    if manual: manual.append(PageBreak())
    manual.extend([p(title, 'HeadS'), *items])

mp('Manual de usuario', [figure(LOGO, 65), p('SESHA APP', 'TitleS'), p('Acceso, documentos, desprendibles quincenales y solicitudes de personal.'),
    p('<b>Edición:</b> 15 de noviembre de 2026. <b>Aplicación:</b> <link href="https://sesha-app.vercel.app" color="#087f80">sesha-app.vercel.app</link>.'),
    table([['Sección', 'Contenido'], ['1 y 2', 'Obtener una cuenta, ingresar y cambiar la contraseña'], ['3 a 5', 'Documentos, constancia laboral y desprendible quincenal'],
        ['6 y 7', 'Datos del formulario, permisos, ajuste de nómina y soporte PDF'], ['8 y 9', 'Revisión administrativa y gestión del directorio'], ['10 y 11', 'Ayuda, seguridad y alcance de esta edición']], [MW * .18, MW * .82]),
    Spacer(1, 9), p('El administrador crea las cuentas de acceso. El empleado consulta su información y radica sus propios trámites. Las credenciales se entregan por un canal privado.')])

mp('1. Obtener una cuenta e ingresar', [columns([
    p('Alta por el administrador', 'SubS'), p('1. Solicita tu acceso al responsable de SESHA.'),
    p('2. El administrador abre <b>Empleados &gt; Nuevo empleado</b> y registra nombre, documento, cargo, departamento y fecha de ingreso verificados.'),
    p('3. Para habilitar el ingreso, indica un correo <b>@sesha.com</b>, marca <b>Crear también su cuenta de acceso</b> e introduce la contraseña inicial.'),
    p('4. La contraseña inicial debe tener al menos <b>12 caracteres</b> y máximo <b>72 bytes UTF-8</b>. Después de Guardar, recibe tus credenciales por un canal privado.'),
    p('5. Ingresa con correo y contraseña. Utiliza <b>Cerrar sesión</b> al terminar.'),
    p('El registro público está cerrado en producción. El cargo laboral y el rol de administrador son conceptos distintos.', 'SmallS')],
    [figure(ROOT / 'docs/manual/2026-11-14/capturas/ingreso.png', 240), p('Referencia visual: ingreso del 14/11/2026 con campos vacíos.', 'SmallS')], MW)])

mp('2. Cambiar tu contraseña', [columns([
    p('Desde la pantalla de ingreso, pulsa <b>Cambiar contraseña</b>.'),
    p('1. Escribe el correo de tu cuenta y tu <b>Contraseña actual</b>.'),
    p('2. Introduce una <b>Nueva contraseña</b> diferente de la anterior: mínimo 12 caracteres y máximo 72 bytes UTF-8, sin caracteres de control.'),
    p('3. Repite la nueva clave en <b>Confirmar nueva contraseña</b>.'),
    p('4. Pulsa <b>Guardar nueva contraseña</b>. Espera la confirmación y vuelve a ingresar con la nueva clave.'),
    p('Al guardar se invalidan las sesiones anteriores de esa cuenta. Las claves se muestran enmascaradas.'),
    p('Si olvidaste la contraseña actual, solicita ayuda al responsable. No hay recuperación automática por correo. No compartas contraseñas ni capturas que las contengan.', 'SmallS')],
    [figure(ROOT / 'docs/manual/2026-11-14/capturas/cambio-contrasena.png', 225), p('Referencia visual: formulario vacío del 14/11/2026.', 'SmallS')], MW)])

mp('3. Consultar el perfil y usar Documentos', [
    p('En <b>Mi perfil</b>, revisa nombre, documento, correo, cargo, departamento, estado y fecha de ingreso. Solicita al administrador la corrección de cualquier dato.'),
    table([['Bloque de Documentos', 'Cómo utilizarlo'], ['Constancia laboral', 'Pulsa Descargar constancia laboral. El PDF utiliza los datos actuales del perfil y la fecha de expedición. También está disponible en Mi perfil.'],
        ['Desprendible de nómina', 'Selecciona un mes y una quincena finalizada. Revisa el detalle antes de descargar el PDF.'],
        ['Solicitud de permiso o ajuste de nómina', 'Revisa los datos automáticos, elige el tipo, completa fecha y motivo y adjunta soporte si lo necesitas.'],
        ['Adjuntar PDF / Documentos guardados', 'Carga independiente de PDF y listado paginado para descargar o eliminar los archivos permitidos.']], [MW * .30, MW * .70]),
    Spacer(1, 10), p('<b>Guardar un documento:</b> Adjuntar PDF &gt; Examinar o Elegir archivo &gt; seleccionar PDF &gt; Guardar documento. El archivo debe ser un PDF válido de máximo <b>3 MB</b> (3.145.728 bytes).'),
    p('Los documentos vinculados a una solicitud no se pueden eliminar mientras exista esa relación. La descarga de constancias y desprendibles genera un PDF; no lo añade automáticamente al listado de archivos cargados.', 'SmallS')])

mp('4. Descargar el desprendible quincenal', [
    p('1. Abre <b>Documentos &gt; Desprendible de nómina</b>. 2. Elige mes y quincena. 3. Revisa asignación mensual, devengado, deducciones y total a pagar. 4. Pulsa <b>Descargar desprendible</b>.'),
    table([['Dato', 'Interpretación'], ['Asignación mensual neta', 'Valor mensual configurado para tu cargo. El neto de cada quincena corresponde a la mitad.'],
        ['Primera / segunda quincena', 'Del 1 al 15 / del 16 al último día del mes. Solo se permiten cortes finalizados.'],
        ['Devengado y deducciones', 'Se calcula una base para mantener el neto acordado. Salud 2 % y pensión 2 % sobre ese devengado, con redondeo individual al peso.'],
        ['Pago informado', 'Transferencia a cuenta del empleado en Bancolombia. La aplicación muestra el medio informado por SESHA; no confirma una transacción bancaria.']], [MW * .25, MW * .75]),
    p('Ejemplo de un cargo con asignación mensual neta de $3.200.000', 'SubS'),
    table([['Devengado quincenal', 'Salud (2 %)', 'Pensión (2 %)', 'Total deducciones', 'Total a pagar'], ['$1.666.666', '$33.333', '$33.333', '$66.666', '$1.600.000']], [MW / 5] * 5),
    Spacer(1, 8), p('El 15/11/2026 está disponible la primera quincena de noviembre; la segunda todavía no ha finalizado. Si ingresaste durante el período, solicita revisión de los días trabajados. Las tasas del comprobante son una configuración solicitada y no sustituyen la liquidación legal de aportes. No incluye recargos, horas extra, auxilios ni novedades.', 'SmallS')])

salary_rows = [
    ['Guarda de seguridad', '$2.600.000', '2x2x2'], ['Supervisor / supervisor de medios tecnológicos', '$3.200.000', '2x2x2'],
    ['Guarda canino', '$2.800.000', '2x2x2'], ['Escolta de mercancías', '$3.200.000', '2x2x2'], ['Escolta VIP', '$3.500.000', '2x2x2'],
    ['Coordinador de operaciones', '$4.500.000', '2x2x2'], ['Coordinador de escoltas', '$4.600.000', '2x2x2'],
    ['Operador de medios tecnológicos', '$2.900.000', '2x2x2'], ['Personal administrativo', '$2.000.000', 'Lunes a viernes'],
    ['Personal técnico', '$2.200.000', 'Lunes a viernes'], ['Personal tecnólogo', '$2.500.000', 'Lunes a viernes']]
mp('5. Asignaciones mensuales y programación', [table([['Cargo o grupo', 'Neto mensual (COP)', 'Programación']] + salary_rows, [MW * .57, MW * .23, MW * .20], padding=6),
    Spacer(1, 10), p('<b>Ciclo 2x2x2:</b> dos días diurnos de 12 horas, dos noches de 12 horas y dos días completos de descanso. La programación describe el cargo; no acredita asistencia a turnos concretos.'),
    p('El grupo administrativo comprende los cargos configurados de asistencia administrativa, almacén, operaciones y talento humano. El grupo técnico incluye auxiliar de tecnología. Si un cargo no tiene asignación configurada, el administrador debe revisarlo; no se asigna un salario aproximado.', 'SmallS')])

mp('6. Conocer el nuevo formato de solicitudes', [
    p('Disponible en <b>Documentos</b> y <b>Solicitudes</b>. Ambos accesos usan el mismo formulario y guardan en el mismo historial.'),
    table([['Campo del formato', 'Qué debes revisar o completar'], ['Nombre, documento y correo', 'Se completan con la identidad de tu cuenta y perfil laboral. Son de solo lectura.'],
        ['Cargo y área o departamento', 'Se completan desde tu perfil activo. Si hay un error, pide al administrador que lo corrija.'],
        ['Fecha de solicitud', 'La registra automáticamente el servidor con la fecha de Bogotá. No tienes que escribirla.'],
        ['Tipo de solicitud', 'Elige una de las cuatro opciones del desplegable.'], ['Fecha solicitada para el permiso', 'Para permisos: fecha válida igual o posterior a la solicitud. Para ajuste de nómina: N/A.'],
        ['Motivo', 'Describe qué necesitas y los detalles que debe revisar el administrador. Entre 3 y 2.000 caracteres.'],
        ['Soporte PDF opcional', 'Con Examinar puedes adjuntar un PDF de hasta 3 MB cuando sea necesario.']], [MW * .32, MW * .68]),
    Spacer(1, 10), p('Esquema de uso: <b>Revisar datos &gt; Elegir tipo &gt; Fecha o N/A &gt; Motivo y soporte &gt; Enviar solicitud &gt; Consultar historial</b>.'),
    p('Esta tabla explica los controles vigentes; no es una captura de pantalla del navegador.', 'SmallS')])

mp('7. Radicar un permiso o un ajuste de nómina', [
    table([['Tipo de solicitud', 'Fecha del permiso', 'Cómo completar el motivo'], ['Día de la familia', 'Obligatoria', 'Indica la fecha que solicitas y los detalles necesarios para su revisión.'],
        ['Permiso remunerado', 'Obligatoria', 'Explica la necesidad del permiso y adjunta soporte si corresponde.'], ['Permiso no remunerado', 'Obligatoria', 'Explica la necesidad del permiso y adjunta soporte si corresponde.'],
        ['Ajuste de nómina', 'N/A - no aplica', 'Indica la quincena, el concepto y el valor que solicitas revisar, si lo conoces.']], [MW * .26, MW * .21, MW * .53]),
    Spacer(1, 10), p('1. Comprueba tus datos. 2. Selecciona el tipo. 3. Para un permiso, escribe la fecha deseada; para un ajuste, el campo cambia a <b>N/A</b>. 4. Escribe el motivo. 5. Usa <b>Examinar</b> si necesitas un soporte. 6. Pulsa <b>Enviar solicitud</b> una vez y espera la confirmación.'),
    p('Después de guardar', 'SubS'), p('La solicitud queda <b>Pendiente</b>. Abre <b>Consultar el estado de mis solicitudes</b> o ve al menú Solicitudes. Allí verás datos del solicitante, fechas, motivo, soporte y estado.'),
    p('Si falla el envío, se conserva el motivo. Si el PDF ya se guardó, se reutiliza al reintentar. Si la conexión se interrumpe y no tienes confirmación, consulta primero el historial. Radicar no equivale a obtener aprobación ni a modificar un pago.', 'SmallS')])

mp('8. Revisar las solicitudes', [
    p('<b>Empleado:</b> consulta sus propias solicitudes y descarga sus soportes. Puede eliminar una solicitud mientras esté Pendiente; se pide confirmación antes de eliminar.'),
    p('<b>Administrador:</b> abre Solicitudes, revisa la identidad del solicitante, su documento, cargo, área, fecha de solicitud, fecha deseada o N/A, motivo y PDF. En <b>Estado</b> elige Pendiente, Aprobado o Rechazado; el cambio se guarda automáticamente.'),
    table([['Acción', 'Empleado', 'Administrador'], ['Ver documentos y solicitudes', 'Los propios', 'Todos los del módulo'], ['Radicar con el nuevo formato', 'Con su perfil activo', 'Revisa desde el historial'],
        ['Cambiar el estado', 'No', 'Sí'], ['Eliminar solicitudes', 'Solo propias pendientes', 'Sí'], ['Corregir datos del perfil', 'Solicita la corrección', 'Desde Empleados']], [MW * .36, MW * .32, MW * .32]),
    Spacer(1, 10), p('Las solicitudes antiguas siguen visibles. Si no tenían fecha de permiso o documento del solicitante guardados, el historial indica <b>Sin registrar</b>. El sistema no inventa datos históricos.'),
    p('No se envían avisos automáticos por correo. El empleado consulta la decisión en el historial. Un ajuste aprobado no cambia por sí solo el desprendible: el responsable debe revisar y gestionar la novedad.', 'SmallS')])

mp('9. Gestionar empleados y distinguir homónimos', [
    p('El directorio está disponible para administradores. Usa <b>Nuevo empleado</b> para el alta y <b>Editar</b> en una fila existente para corregir datos.'),
    table([['Dato o acción', 'Criterio de uso'], ['Nombre y apellidos', 'Pueden repetirse entre empleados. Escribe los datos personales correctos; no necesitas añadirles un número.'],
        ['Correo y documento', 'Deben ser únicos. La secuencia numérica del correo ayuda a distinguir cuentas con nombres comunes; no concede permisos.'],
        ['Crear también su cuenta de acceso', 'Actívala cuando necesites crear el acceso junto con el perfil. Si vinculas una cuenta ya existente, no crees otra.'],
        ['Estado Activo / Inactivo', 'Permite gestionar el perfil laboral. No cambia el rol de acceso. Reactivar accesos comprometidos requiere sustituir antes sus credenciales.'],
        ['Fecha de ingreso', 'Registra una fecha verificada y no futura. Se utiliza en constancias y en la validación del desprendible.']], [MW * .32, MW * .68]),
    Spacer(1, 10), p('La lista está paginada y la búsqueda filtra la página visible. En pantallas pequeñas, desplaza la tabla horizontalmente para alcanzar Editar. El empleado no tiene autoedición de sus datos laborales.', 'SmallS')])

mp('10. Resolver incidencias y proteger el acceso', [
    table([['Situación', 'Qué hacer'], ['No puedo ingresar / sesión expirada', 'Revisa correo y clave. Vuelve a iniciar sesión. Si la cuenta está deshabilitada, consulta al responsable.'],
        ['El formulario indica perfil incompleto o inactivo', 'Pide al administrador que complete o active el perfil. Usa Reintentar datos del solicitante después de la corrección.'],
        ['No permite enviar el permiso', 'Comprueba motivo y fecha. La fecha no puede ser anterior al día de solicitud.'],
        ['No permite descargar la quincena', 'Comprueba que haya finalizado y que no sea anterior al ingreso. Si ingresaste durante el período, solicita revisión.'],
        ['Error al cargar el soporte', 'Comprueba que sea un PDF válido de máximo 3 MB. Mantén el motivo y vuelve a enviar después de corregirlo.'],
        ['No permite eliminar un PDF', 'Puede estar vinculado a una solicitud. Revisa la relación antes de intentar borrarlo.']], [MW * .36, MW * .64]),
    Spacer(1, 10), p('Utiliza una contraseña propia y mantenla privada. Cierra la sesión en equipos compartidos. No publiques listados de acceso, datos personales ni archivos de respaldo en el portal de informes.')])

mp('11. Versión y alcance de esta guía', [
    p('Esta edición describe la versión de SESHA publicada en Vercel el <b>15/11/2026</b>, con desprendibles quincenales y el nuevo formato de solicitudes. Las instrucciones se contrastaron con el código y con una nueva campaña funcional, de rendimiento y seguridad.'),
    p('Las dos imágenes de acceso proceden del 14/11/2026 y contienen campos vacíos. Los nuevos formularios se explican mediante tablas; no se presentan capturas históricas como evidencia visual de la versión actual.'),
    p(f"La nueva campaña aprobó {FC['backend']['passed']} pruebas de backend, {FC['frontend']['passed']} de interfaz y {FC['http']['passed']} verificaciones HTTP, incluidas fechas, N/A, soporte y nómina. Las escrituras de prueba se realizaron con datos sintéticos en MongoDB temporal. El sitio publicado se contrastó con lecturas y entradas inválidas sin escrituras de negocio."),
    p('Se repitieron k6 local y ZAP local y autenticado en Vercel; los resultados y límites están en los informes de pruebas del 15/11. No se completó una nueva revisión visual del navegador, una campaña móvil ni un nuevo respaldo; las evidencias anteriores conservan su fecha.'),
    p('Documentación complementaria', 'SubS'),
    p('<link href="https://alexriver101219.github.io/PROYECTO_SENA/" color="#087f80">Portal de manual e informes</link>'),
    p('<link href="https://github.com/alexriver101219/PROYECTO_SENA/blob/4fdbd9686367fbada6aee3c62761e0ded956e5bc/NOMINA.md" color="#087f80">Criterios de los desprendibles</link>'),
    p('<link href="https://github.com/alexriver101219/PROYECTO_SENA/blob/4fdbd9686367fbada6aee3c62761e0ded956e5bc/SOLICITUDES.md" color="#087f80">Flujo y controles de solicitudes</link>'),
    p('La guía no contiene credenciales. Para obtener ayuda sobre tus datos o un trámite concreto, utiliza el canal interno autorizado de SESHA.', 'SmallS')])

manual_target = OUT / 'manual-usuario-sesha.pdf'
build(manual_target, manual, landscape(A4), 'Manual de usuario')
manual_reader = PdfReader(manual_target)
assert len(manual_reader.pages) == 12, f'Revisar paginación del manual: {len(manual_reader.pages)}'
shutil.copy2(manual_target, MANUAL / manual_target.name)
manual_meta = {'date': DATE, 'title': 'Manual de usuario de SESHA APP', 'file': manual_target.name, 'pages': len(manual_reader.pages),
    'bytes': manual_target.stat().st_size, 'sha256': hashlib.sha256(manual_target.read_bytes()).hexdigest(),
    'applicationChangesPublished': True, 'applicationCommit': APP_COMMIT, 'evidence': '../../actualizaciones/2026-11-15/verificacion.json',
    'revision': 'Campaña completa de pruebas repetidas',
    'currentSections': ['Acceso y contraseña', 'Constancia y PDF', 'Desprendible quincenal', 'Permisos y ajuste de nómina', 'Revisión administrativa', 'Ayuda y seguridad'],
    'historicalScreenshotsDate': '2026-11-14', 'newBrowserVisualReview': False}
(MANUAL / 'verificacion-entrega.json').write_text(json.dumps(manual_meta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# La parte vigente va primero. La entrega de 36 páginas se incorpora íntegra
# como anexo histórico rotulado, sin reescribir resultados ni eliminar fallos.
TW = A4[0] - 32 * mm
tech = []
def tp(title, items):
    if tech: tech.append(PageBreak())
    tech.extend([p(title, 'HeadS'), *items])

tp('Informe técnico consolidado', [Spacer(1, 12), figure(LOGO, 67), Spacer(1, 15), p('Evolución, seguridad y validación de SESHA APP', 'TitleS'),
    p('<b>Aprendiz:</b> Alexander Rivera Sánchez<br/><b>Instructor:</b> Alexander Mosquera Aguirre<br/><b>Ficha:</b> 3186701<br/><b>Institución:</b> SENA 2026'),
    p('<b>Fecha de corte:</b> 15 de noviembre de 2026.<br/><b>Periodo documentado:</b> 27/07/2026 a 15/11/2026, más una captura histórica sin fecha.'),
    p('La parte I presenta el estado vigente y la campaña repetida del 15/11. La parte II conserva la edición del 14/11 como anexo histórico, incluidas sus pruebas fallidas, capturas y referencias.'),
    p('Resumen', 'SubS'), p(f"La aplicación incorpora desprendibles quincenales privados y solicitudes de personal con identidad del servidor, fechas y soporte opcional. La nueva campaña registra {TOTAL} comprobaciones funcionales locales aprobadas. k6: {capacity}. ZAP local: {risks(ZS)}. ZAP en Vercel: {risks(remote_campaign)}. Estos resultados se limitan al entorno y casos ejecutados, sin certificar seguridad absoluta ni capacidad de producción."),
    p('Presentación con alineación izquierda y elementos institucionales; referencias según APA 7. Las fechas operativas corresponden a America/Bogota.', 'SmallS')])

tp('Parte I. Introducción y objetivos vigentes', [
    p('SESHA APP gestiona empleados, documentos y trámites internos mediante React/Vite, una API Express y MongoDB Atlas. La ampliación del 15 de noviembre añade la consulta de desprendibles y un formato uniforme de solicitudes en Documentos y Solicitudes (SESHA APP, 2026a, 2026b).'),
    p('Objetivo general', 'SubS'), p('Actualizar la documentación funcional y técnica del sistema publicado, relacionando cada cambio con sus controles de identidad, persistencia y evidencia de verificación.'),
    p('Objetivos específicos', 'SubS'), p('1. Describir la liquidación quincenal configurada, sus períodos, redondeos y límites.<br/>2. Documentar datos, tipos, fechas y soportes del nuevo formato de solicitudes.<br/>3. Verificar permisos por rol y la persistencia de los trámites.<br/>4. Diferenciar las verificaciones actuales de las campañas históricas de seguridad, carga y respaldo.'),
    p('Alcance y organización', 'SubS'), p('La parte I sustituye, para el estado actual, las descripciones y conclusiones funcionales de la edición anterior. La parte II conserva esa edición completa como evidencia histórica. Sus menciones a cuentas en cuarentena, cantidades de pruebas y formularios antiguos corresponden al corte del 14/11; no describen por sí solas el estado del 15/11.'),
    p('Se repitieron Vitest, HTTP, k6, ZAP local y ZAP autenticado en Vercel. No se realizó una nueva restauración de respaldo. La mezcla de k6 incorpora nómina y formulario de solicitudes y difiere de la campaña anterior; no se comparan sus tasas como si fueran cargas idénticas.', 'SmallS')])

tp('Arquitectura y mantenimiento de cuentas', [
    p('El cliente React consulta la API de la misma aplicación en Vercel. El servidor autentica cada solicitud mediante JWT y recupera la cuenta desde MongoDB. Las sesiones web se transportan mediante cookie HttpOnly; las escrituras con cookie requieren protección CSRF.'),
    table([['Componente', 'Responsabilidad'], ['React / Vite', 'Formulario reutilizable, historial, selección de quincena y descarga de PDF.'], ['Express en Vercel', 'Autenticación, autorización por rol, validación de campos y generación de documentos.'],
        ['MongoDB Atlas', 'Cuentas, perfiles laborales, documentos y solicitudes persistidos.'], ['GitHub / CI', 'Código versionado, comprobaciones automáticas y despliegue asociado al commit.']], [TW * .29, TW * .71]),
    p('Estado contrastado del mantenimiento', 'SubS'), p('La verificación del 15/11/2026 registró 152 cuentas activas: 151 accesos de empleado y una cuenta administradora. Se verificaron las 151 contraseñas de empleado y la unicidad de 152 documentos. La operación dejó sin cambios el acceso del administrador; esta evidencia no publica contraseñas ni documentos personales (SESHA APP, 2026c).'),
    p('La cuarentena de 139 cuentas documentada el 14/11 se conserva en el anexo como antecedente. Las intervenciones posteriores autorizadas sustituyeron credenciales afectadas y reactivaron accesos. El estado laboral del perfil y el estado de la cuenta son campos distintos; asignar un cargo administrativo no otorga el rol admin.'),
    p('Las credenciales y los respaldos permanecen fuera del repositorio público. Eliminar un literal del código no elimina su historial ni sustituye la rotación de una credencial que haya sido expuesta.', 'SmallS')])

tp('Desprendibles quincenales', [
    p('La identidad se toma de la sesión y del perfil laboral activo vinculado en MongoDB. El cliente solo selecciona mes y quincena. Las rutas privadas GET /api/documentos/nomina y /api/documentos/nomina/pdf rechazan parámetros de identidad o importes, cortes abiertos y períodos anteriores al ingreso (SESHA APP, 2026a).'),
    p('Cálculo y período', 'SubS'), p('Los valores por cargo son netos mensuales configurados por el propietario. El neto quincenal es su mitad. Se busca un devengado entero que satisfaga devengado - salud - pensión = neto; cada deducción es el 2 % del devengado, redondeada individualmente al peso.'),
    table([['Ejemplo de supervisor', 'COP'], ['Asignación mensual neta', '3.200.000'], ['Devengado quincenal', '1.666.666'], ['Salud / pensión', '33.333 / 33.333'], ['Total deducciones', '66.666'], ['Total quincenal a pagar', '1.600.000']], [TW * .63, TW * .37]),
    Spacer(1, 8), p('La primera quincena comprende 1-15 y la segunda 16-fin de mes. Se valida el cierre con la fecha de Bogotá y se contemplan febrero y años bisiestos. El ingreso dentro del período exige revisión de los días trabajados.'),
    p('Límites de la funcionalidad', 'SubS'), p('La base se calcula desde el neto acordado; no es un básico contractual histórico almacenado. Las tasas configuradas no sustituyen la liquidación legal de aportes. No se liquidan recargos, extras ni novedades, y no existe integración bancaria. Bancolombia y la transferencia son información suministrada por SESHA, sin confirmación de transacción.'),
    p('La programación 2x2x2 describe dos turnos diurnos de 12 h, dos nocturnos de 12 h y dos descansos. El personal administrativo, técnico y tecnólogo configura lunes a viernes. No se inventan fechas de asistencia.', 'SmallS')])

tp('Formato de solicitudes y modelo de datos', [
    p('EmployeeRequestForm se reutiliza en Documentos y Solicitudes. GET /api/solicitudes/formulario obtiene nombre, documento, correo, cargo, área, fecha de Bogotá y los cuatro tipos. El formulario exige una cuenta de empleado con perfil laboral activo (SESHA APP, 2026b).'),
    table([['Campo', 'Origen y regla'], ['owner', 'Cuenta autenticada. Nunca se acepta desde el cliente.'], ['empleado', 'Copia del nombre, documento, correo, cargo y área al radicar. Preserva los datos del momento.'],
        ['fechaSolicitud', 'Fecha del servidor en America/Bogota.'], ['tipo', 'Día de la familia, Permiso remunerado, Permiso no remunerado o Ajuste de nómina.'],
        ['fechaPermiso', 'Fecha ISO válida, no anterior a la radicación; para ajuste de nómina es null y se presenta N/A.'], ['descripcion / documento', 'Motivo de 3-2.000 caracteres; referencia opcional a un PDF propio de hasta 3 MB.'],
        ['estado', 'Pendiente al crear. Solo admin puede cambiarlo.']], [TW * .25, TW * .75]),
    Spacer(1, 8), p('POST /api/solicitudes permite exclusivamente tipo, descripcion, fechaPermiso y documento. Rechaza identidad, propietario, fecha de radicación y estado introducidos por el cliente. El servidor comprueba que el soporte pertenezca al solicitante.'),
    p('Se conserva la compatibilidad de las solicitudes antiguas: no se inventan fechas ni copias de datos faltantes. Los tipos anteriores se mantienen en el modelo para leer y gestionar el historial; el nuevo desplegable presenta solo las cuatro opciones vigentes.', 'SmallS')])

tp('Autorización, experiencia de uso y persistencia', [
    table([['Operación', 'Control aplicado'], ['Listar solicitudes', 'Empleado: filtro por propietario. Administrador: listado general.'], ['Aprobar o rechazar', 'PUT /api/solicitudes/:id exige admin y solo admite estado.'],
        ['Eliminar una solicitud', 'Empleado: propia y pendiente. Administrador: gestión general.'], ['Eliminar el soporte', 'Se bloquea mientras una solicitud lo referencie.'],
        ['Errores al radicar', 'Se conserva el motivo y se reutiliza el soporte ya cargado al reintentar.'], ['Clics repetidos', 'El envío en curso bloquea la acción para evitar duplicación por clics.']], [TW * .35, TW * .65]),
    p('Secuencia de una radicación', 'SubS'), p('1. El servidor carga el perfil de la sesión.<br/>2. El empleado selecciona tipo, fecha o N/A y motivo.<br/>3. Si hay soporte, se guarda primero el PDF.<br/>4. El servidor valida y persiste la solicitud con identidad y fecha propias.<br/>5. El historial permite consultar datos y estado.<br/>6. El administrador revisa y decide.'),
    p('La confirmación de éxito se muestra cuando la respuesta incluye un identificador de solicitud. Una interrupción de red puede requerir consultar el historial antes de reintentar. El bloqueo de clics no equivale a una garantía de idempotencia distribuida.'),
    p('Radicar o aprobar un ajuste no altera automáticamente una liquidación ni ejecuta transferencias. No se implementaron notificaciones por correo. Estos límites deben acompañar cualquier demostración del flujo.', 'SmallS')])

tp('Validación del 15/11/2026 y sus límites', [
    table([['Evidencia', 'Resultado y alcance'], ['Funcionales locales', f"{FC['backend']['passed']} backend + {FC['frontend']['passed']} interfaz + {FC['http']['passed']} HTTP = {TOTAL} aprobadas; ejecución nueva."],
        ['Producción', f"{FC['production']['passed']} comprobaciones aprobadas sin escrituras de negocio; compilado contrastado."],
        ['k6 local', capacity], ['Etapas k6 fallidas', str(sum(not item['passed'] for item in PERF['runs']))+'; se conservan con sus errores, latencias y descartes.'],
        ['ZAP local', risks(ZS)], ['ZAP Vercel', risks(remote_campaign)],
        ['Dependencias', str(ZS['npmAudit']['total'])+' vulnerabilidades conocidas en npm audit.'], ['Alcance funcional nuevo', 'Fechas, identidad, N/A, adjuntos, aislamiento, aprobación y nómina quincenal.']], [TW * .29, TW * .71]),
    p('Trazabilidad de la aplicación', 'SubS'), p(f'Commit de referencia: <font size="8">{APP_COMMIT}</font>.<br/>Despliegue: <font size="8">{APP_DEPLOYMENT}</font>.<br/>Las horas, la huella del código medido, los intentos iniciales y los resultados completos se conservan en los JSON sanitizados (SESHA APP, 2026c, 2026d).'),
    p('El escáner del código actual no dejó hallazgos pendientes y la compilación no presentó coincidencias. Los hallazgos históricos y los falsos positivos revisados siguen documentados; no se declara un historial libre de exposición.'),
    p('Los intentos iniciales fallidos y las correcciones del ensayo se conservan en el informe funcional. No se completó revisión visual nueva, prueba en teléfono físico ni carga sobre Vercel/Atlas. Los resultados del anexo mantienen su corte del 14/11.', 'SmallS')])

tp('Conclusiones y referencias de la actualización', [
    p('La ampliación conserva el control de identidad en el servidor y conecta la radicación con MongoDB. El formulario unifica datos personales, fechas y soportes, mientras el historial distingue consulta del empleado y decisión administrativa.'),
    p('El desprendible respeta el neto mensual configurado, divide el pago por quincena y presenta devengado y deducciones conciliados. Su alcance debe comunicarse con claridad: tasas solicitadas, ausencia de liquidación de novedades y sin confirmación bancaria.'),
    p(f"Las {TOTAL} comprobaciones locales y la revisión acotada de producción respaldan los casos ejecutados. k6 confirmó {capacity.lower()}; las etapas fallidas se conservan. ZAP local y Vercel mantienen los riesgos observados sin atribuirles una cobertura total. Siguen pendientes la revisión visual completa, una liquidación histórica de novedades y medir capacidad de producción."),
    p('Referencias', 'SubS'),
    p('SESHA APP. (2026a, 15 de noviembre). <i>Desprendible de nómina de SESHA</i> [Documentación técnica]. GitHub. <link href="https://github.com/alexriver101219/PROYECTO_SENA/blob/4fdbd9686367fbada6aee3c62761e0ded956e5bc/NOMINA.md" color="#087f80">NOMINA.md, versión verificada</link>.', 'RefS'),
    p('SESHA APP. (2026b, 15 de noviembre). <i>Solicitudes de los empleados</i> [Documentación técnica]. GitHub. <link href="https://github.com/alexriver101219/PROYECTO_SENA/blob/4fdbd9686367fbada6aee3c62761e0ded956e5bc/SOLICITUDES.md" color="#087f80">SOLICITUDES.md, versión verificada</link>.', 'RefS'),
    p('SESHA APP. (2026c, 15 de noviembre). <i>Verificación de la actualización documental y funcional</i> [Resumen sanitizado de evidencias]. GitHub Pages. <link href="https://alexriver101219.github.io/PROYECTO_SENA/actualizaciones/2026-11-15/verificacion.json" color="#087f80">Evidencia agregada del 15/11/2026</link>.', 'RefS'),
    p('SESHA APP. (2026d, 15 de noviembre). <i>Resultados de la campaña repetida de pruebas</i> [Conjunto de datos]. GitHub Pages. <link href="https://alexriver101219.github.io/PROYECTO_SENA/pruebas/2026-11-15/resultados.json" color="#087f80">Funcionales, k6 y ZAP local</link>; <link href="https://alexriver101219.github.io/PROYECTO_SENA/pruebas/2026-11-15/zap-vercel-resultados.json" color="#087f80">ZAP autenticado en Vercel</link>.', 'RefS'),
    p('La parte II conserva las referencias APA 7, las diez tablas y las catorce imágenes de la edición anterior con su procedencia original.', 'SmallS')])

tp('Parte II. Anexo histórico íntegro', [Spacer(1, 25), p('Informe consolidado con corte al 14/11/2026', 'TitleS'),
    p('A continuación se conserva la entrega anterior de 36 páginas. Su contenido describe una versión y unas operaciones anteriores a la ampliación del 15/11.'),
    p('Las cuentas en cuarentena, los formularios y las cifras de pruebas que aparecen en este anexo corresponden a ese momento. Para el estado vigente, consulte la parte I de este documento.'),
    p('Se mantienen ocho capturas históricas de Jest, seis capturas de informes verificados de k6/ZAP, diez tablas, las etapas fuera de umbral, las alertas pendientes y las referencias. No se realizaron nuevas ejecuciones para reproducir esas páginas.'),
    p('El anexo conserva la numeración original de sus páginas en el encabezado. Cada página lleva además una banda inferior que la identifica como evidencia histórica.'),
    p('Fuente: edición pública del 14/11/2026, conservada en docs/informes/2026-11-14/.', 'SmallS')])

current_part = RENDER / 'informe-parte-vigente.pdf'
build(current_part, tech, A4, 'Informe técnico', institutional=True)
current_reader = PdfReader(current_part)
assert len(current_reader.pages) == 9, f'Revisar paginación técnica: {len(current_reader.pages)}'
writer = PdfWriter()
writer.append(current_reader, import_outline=False)
writer.add_outline_item(title='Parte I - Estado vigente al 15/11/2026', page_number=0)
writer.add_outline_item(title='Parte II - Anexo histórico del 14/11/2026', page_number=len(current_reader.pages) - 1)
for index, page in enumerate(historical.pages):
    overlay = io.BytesIO()
    c = canvas.Canvas(overlay, pagesize=(float(page.mediabox.width), float(page.mediabox.height)))
    c.setFillColor(colors.HexColor('#e7f1f4')); c.rect(0, 0, float(page.mediabox.width), 12, fill=1, stroke=0)
    c.setFillColor(NAVY); c.setFont('Segoe', 6)
    c.drawCentredString(float(page.mediabox.width) / 2, 4, f'ANEXO HISTÓRICO | Corte 14/11/2026 | Página original {index + 1} de 36 | Estado vigente: parte I')
    c.save(); writer.add_page(page); writer.pages[-1].merge_page(PdfReader(overlay).pages[0])
writer.add_metadata({'/Title': 'SESHA APP - Informe técnico consolidado actualizado al 15/11/2026', '/Author': 'Alexander Rivera Sánchez',
    '/Subject': 'Parte vigente y anexo histórico conservado; SENA 2026, ficha 3186701'})
tech_target = OUT / 'informe-tecnico-consolidado-sesha.pdf'
writer.compress_identical_objects()
with tech_target.open('wb') as stream:
    writer.write(stream)
shutil.copy2(tech_target, TECH / tech_target.name)
technical_meta = {'date': DATE, 'title': 'Informe técnico consolidado de SESHA APP', 'file': tech_target.name,
    'pages': len(writer.pages), 'currentPages': len(current_reader.pages), 'historicalPages': len(historical.pages),
    'bytes': tech_target.stat().st_size, 'sha256': hashlib.sha256(tech_target.read_bytes()).hexdigest(),
    'period': '27/07/2026 a 15/11/2026, más una captura histórica sin fecha', 'tables': 15, 'historicalTables': 10,
    'historicalCaptures': 8, 'nonfunctionalReportCaptures': 6, 'author': 'Alexander Rivera Sánchez', 'instructor': 'Alexander Mosquera Aguirre',
    'ficha': '3186701', 'applicationCommit': APP_COMMIT, 'format': 'Referencias APA 7, alineación izquierda y elementos institucionales.',
    'note': 'Parte vigente de 9 páginas con la campaña repetida de funcionales, k6 y ZAP; entrega histórica íntegra de 36 páginas rotulada.',
    'evidence': '../../actualizaciones/2026-11-15/verificacion.json'}
(TECH / 'documento.json').write_text(json.dumps(technical_meta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

for file in [manual_target, tech_target]:
    reader = PdfReader(file)
    text = '\n'.join(page.extract_text() or '' for page in reader.pages)
    assert all(len(page.extract_text() or '') > 100 for page in reader.pages)
    for phrase in ['Ajuste de nómina', 'N/A', '1.600.000', 'Bancolombia', '15/11/2026']:
        assert phrase in text, (file.name, phrase)
    assert not re.search(r'mongodb\+srv://|sesha_session=|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', text)
print(json.dumps({'manual': manual_meta, 'technical': technical_meta}, ensure_ascii=False))
