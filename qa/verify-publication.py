"""Verifica enlaces, copias PDF y ausencia de formatos habituales de secretos."""
from pathlib import Path
from html.parser import HTMLParser
import re
import json
import os
import hashlib
import zipfile
from pypdf import PdfReader
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LATEST_MANUAL = ROOT / 'docs/manual/2026-11-15'
HISTORICAL_MANUAL = ROOT / 'docs/manual/2026-11-14'
LATEST_REPORTS = ROOT / 'docs/pruebas' / os.environ.get('REPORT_DATE', '2026-11-15')
PRESENTATION = ROOT / 'docs/presentacion/2026-11-15'
presentation_files = {}
if (PRESENTATION / 'archivos.json').exists():
    presentation = json.loads((PRESENTATION / 'archivos.json').read_text(encoding='utf-8'))
    assert presentation['mainSlides'] == 18 and presentation['supportSlides'] == 4
    for entry in presentation['files']:
        assert Path(entry['file']).name == entry['file']
        file = PRESENTATION / entry['file']
        assert file.stat().st_size == entry['bytes']
        assert hashlib.sha256(file.read_bytes()).hexdigest() == entry['sha256']
        presentation_files[file] = entry
class Links(HTMLParser):
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key == 'href' and not value.startswith(('https:', '#')):
                assert (ROOT / 'docs' / value).is_file(), 'Enlace local inexistente: ' + value
Links().feed((ROOT / 'docs/index.html').read_text(encoding='utf-8'))
technical_directory = ROOT / 'docs/informes/2026-11-15'
if (technical_directory / 'documento.json').exists():
    technical = json.loads((technical_directory / 'documento.json').read_text(encoding='utf-8'))
    assert technical['file'] == 'informe-tecnico-consolidado-sesha.pdf'
    technical_pdf = technical_directory / technical['file']
    assert technical_pdf.read_bytes() == (ROOT / 'output/pdf' / technical['file']).read_bytes()
    assert technical_pdf.stat().st_size == technical['bytes']
    assert hashlib.sha256(technical_pdf.read_bytes()).hexdigest() == technical['sha256']
    has_cors = bool(technical.get('corsRevalidation'))
    assert len(PdfReader(technical_pdf).pages) == technical['pages'] == (46 if has_cors else 45)
    assert technical['currentPages'] == (10 if has_cors else 9) and technical['historicalPages'] == 36
    assert technical['historicalCaptures'] == 8 and technical['nonfunctionalReportCaptures'] == 6
    assert technical['tables'] == (16 if has_cors else 15) and technical['historicalTables'] == 10
    if has_cors:
        assert technical['corsRevalidation']['instancesAfter'] == 0
        assert technical['corsRevalidation']['httpChecks'] == 42
    historical = PdfReader(ROOT / 'docs/informes/2026-11-14' / technical['file'])
    revised = PdfReader(technical_pdf)
    for index, original in enumerate(historical.pages):
        assert ' '.join((original.extract_text() or '').split()) in ' '.join((revised.pages[index + technical['currentPages']].extract_text() or '').split())
pattern = re.compile(r'mongodb\+srv://[^\s]+:[^\s]+@|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|gh[pousr]_[A-Za-z0-9]{20}')
for directory in ['docs', 'qa']:
    for file in (ROOT / directory).rglob('*'):
        if not file.is_file():
            continue
        if file in presentation_files and file.name == 'SESHA-paquete-exposicion.zip':
            with zipfile.ZipFile(file) as archive:
                expected = ['SESHA-sustentacion-final.pptx', 'SESHA-sustentacion-final.pdf', 'guia-ensayo.html', 'LEEME-EXPOSICION.txt']
                assert sorted(archive.namelist()) == sorted('SESHA-exposicion/' + name for name in expected)
                assert archive.testzip() is None
                for name in expected[:3]:
                    assert archive.read('SESHA-exposicion/' + name) == (PRESENTATION / name).read_bytes()
            continue
        assert file.suffix not in {'.gz', '.bson', '.zip', '.archive'}, 'Un respaldo no debe publicarse: ' + str(file)
        if file in presentation_files and file.suffix == '.pptx':
            with zipfile.ZipFile(file) as archive:
                parts = [name for name in archive.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml', name)]
                assert len(parts) == 22 and archive.testzip() is None
                text = '\n'.join(archive.read(name).decode('utf-8') for name in archive.namelist() if name.endswith('.xml'))
            assert not pattern.search(text), 'Revisar posible secreto en la presentación'
            continue
        if file.suffix in {'.png', '.jpg', '.jpeg'}:
            with Image.open(file) as picture:
                picture.verify()
            continue
        if file.suffix == '.pdf':
            reader = PdfReader(file)
            if file in presentation_files:
                assert len(reader.pages) == 22 and all(len(page.images) == 1 for page in reader.pages)
                assert not re.search(rb'hvs\.[A-Za-z0-9_-]{10,}|(?<![A-Za-z0-9])s\.[A-Za-z0-9]{20,}', file.read_bytes())
                continue
            text = '\n'.join(p.extract_text() or '' for p in reader.pages)
            assert all(len(p.extract_text() or '') > 100 for p in reader.pages)
            # La edición histórica del manual se conserva; solo la última comparte
            # el nombre estable del PDF de salida.
            if (file.name == 'manual-usuario-sesha.pdf' and file.parent == LATEST_MANUAL) or (file.parent == LATEST_REPORTS):
                assert file.read_bytes() == (ROOT / 'output/pdf' / file.name).read_bytes()
        else:
            text = file.read_text(encoding='utf-8')
        assert not pattern.search(text), 'Revisar posible secreto: ' + str(file.relative_to(ROOT))
data = json.loads((ROOT / 'docs/pruebas/2026-11-13/resultados.json').read_text(encoding='utf-8'))
assert data['functional']['passed'] == data['functional']['total'] == 77
assert data['performance']['sustained']['targetRps'] == 50
assert data['security']['riskCounts'] == {'high':0, 'medium':1, 'low':1, 'informational':4}
live = ROOT / 'docs/pruebas/2026-11-13/zap-vercel-resultados.json'
if live.exists():
    vercel = json.loads(live.read_text(encoding='utf-8'))
    assert vercel['riskCounts'] == {'high':0, 'medium':2, 'low':0, 'informational':4}
    assert sum(rule['requests'] for rule in vercel['execution']['activeEvidence']) == 22
    assert vercel['checks']['countersUnchanged'] and vercel['checks']['readyStatus'] == 200
if (LATEST_REPORTS / 'resultados.json').exists():
    current = json.loads((LATEST_REPORTS / 'resultados.json').read_text(encoding='utf-8'))
    functional = current['functional']
    assert functional['passed'] == functional['total'] == len(functional['tests'])
    assert functional['total'] == sum(functional[suite]['total'] for suite in ['backend', 'frontend', 'http'])
    assert functional['failed'] == 0 and current['protection']['passed']
    for run in current['performance']['runs']:
        if run['passed']:
            assert run['droppedIterations'] == 0 and run['failedRate'] < .01 and run['businessFailedRate'] < .01
            assert run['p95Ms'] < (1000 if run['kind'] == 'login' else 500)
    confirmed = current['performance']['sustained']
    if confirmed:
        assert confirmed in current['performance']['runs'] and confirmed['duration'] == '60s' and confirmed['passed']
    assert current['security']['code'] == 0
    current_vercel = json.loads((LATEST_REPORTS / 'zap-vercel-resultados.json').read_text(encoding='utf-8'))
    assert current_vercel['execution']['code'] == 0 and not current_vercel['execution']['stoppedForHealth']
    assert len(current_vercel['execution']['activeEvidence']) == 2
    assert current_vercel['checks']['readyStatus'] == 200 and current_vercel['checks']['anonymousDashboardStatus'] == 401
    for section in [current['security'], current_vercel]:
        counts = {'high': 0, 'medium': 0, 'low': 0, 'informational': 0}
        for alert in section['alerts']:
            counts[['informational', 'low', 'medium', 'high'][alert['riskCode']]] += 1
        assert counts == section['riskCounts']
    index = json.loads((LATEST_REPORTS / 'documentos.json').read_text(encoding='utf-8'))
    assert len(index['files']) == 4
    for document in index['files']:
        pdf = PdfReader(LATEST_REPORTS / document['file'])
        assert len(pdf.pages) == document['pages']
delivery = HISTORICAL_MANUAL / 'verificacion-entrega.json'
if delivery.exists():
    evidence = json.loads(delivery.read_text(encoding='utf-8'))
    assert evidence['backup']['passed']
    backup_checks = evidence['backup']['checks']
    assert backup_checks and len({item['collection'] for item in backup_checks}) == len(backup_checks)
    assert all(item['documents'] >= 0 and item['indexes'] >= 1 and item['documentsMatch'] and item['indexesMatch'] and item['optionsMatch'] for item in backup_checks)
    assert evidence['apiCheck']['fixturesRemoved'] and evidence['apiCheck']['bytesMatch']
    assert evidence['visualReview']['mobile']['physicalDeviceTested'] is False
    update = evidence['passwordChangeUpdate']
    assert update['requiresCurrentPassword'] and update['previousSessionsRevokedOnSuccess']
    assert update['passwordMinimumCharacters'] == 12 and update['passwordMaximumUtf8Bytes'] == 72
    assert update['credentialsEnteredForDocumentation'] is False
    assert update['productionAccountsChangedForDocumentation'] is False
    assert update['deploymentPending'] is (not evidence['applicationChangesPublished'])
    if evidence['applicationChangesPublished']:
        release = evidence['productionVerification']
        assert release['state'] == 'READY' and release['target'] == 'https://sesha-app.vercel.app'
        assert release['checksPassed'] == 12 and release['checksFailed'] == 0
    manual = PdfReader(HISTORICAL_MANUAL / 'manual-usuario-sesha.pdf')
    assert len(manual.pages) == 11
    manual_text = '\n'.join(page.extract_text() or '' for page in manual.pages)
    assert '1.1. Cambiar la contraseña de acceso' in manual_text
    assert 'Guardar nueva contraseña' in manual_text
current_manual = json.loads((LATEST_MANUAL / 'verificacion-entrega.json').read_text(encoding='utf-8'))
assert current_manual['pages'] == 12 and current_manual['applicationChangesPublished']
assert current_manual['newBrowserVisualReview'] is False
assert hashlib.sha256((LATEST_MANUAL / current_manual['file']).read_bytes()).hexdigest() == current_manual['sha256']
manual_text = '\n'.join(page.extract_text() or '' for page in PdfReader(LATEST_MANUAL / current_manual['file']).pages)
for phrase in ['Día de la familia', 'Permiso remunerado', 'Permiso no remunerado', 'Ajuste de nómina', 'N/A', 'Examinar', '1.600.000', 'Bancolombia']:
    assert phrase in manual_text, phrase
evidence = json.loads((ROOT / 'docs/actualizaciones/2026-11-15/verificacion.json').read_text(encoding='utf-8'))
assert evidence['requests']['temporaryRecordsRemoved']
assert evidence['localTests']['total'] == sum(evidence['localTests'][field] for field in ['backend', 'frontend', 'http'])
assert evidence['currentBrowserVisualCheck']['completed'] is False
assert evidence['historicalEvidence']['newK6Run'] and evidence['historicalEvidence']['newZAPRun']
print('Archivos locales verificados: enlaces, copias PDF, evidencia y patrones de secretos. Sin publicación remota.')
