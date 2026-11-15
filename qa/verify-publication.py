"""Verifica enlaces, copias PDF y ausencia de formatos habituales de secretos."""
from pathlib import Path
from html.parser import HTMLParser
import re
import json
import os
from pypdf import PdfReader
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LATEST_MANUAL = ROOT / 'docs/manual/2026-11-14'
LATEST_REPORTS = ROOT / 'docs/pruebas' / os.environ.get('REPORT_DATE', '2026-11-14')
class Links(HTMLParser):
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key == 'href' and not value.startswith(('https:', '#')):
                assert (ROOT / 'docs' / value).is_file(), 'Enlace local inexistente: ' + value
Links().feed((ROOT / 'docs/index.html').read_text(encoding='utf-8'))
technical_directory = ROOT / 'docs/informes/2026-11-14'
if (technical_directory / 'documento.json').exists():
    technical = json.loads((technical_directory / 'documento.json').read_text(encoding='utf-8'))
    assert technical['file'] == 'informe-tecnico-consolidado-sesha.pdf'
    technical_pdf = technical_directory / technical['file']
    assert technical_pdf.read_bytes() == (ROOT / 'output/pdf' / technical['file']).read_bytes()
    assert technical_pdf.stat().st_size == technical['bytes']
    assert len(PdfReader(technical_pdf).pages) == technical['pages'] == 36
    assert technical['historicalCaptures'] == 8 and technical['nonfunctionalReportCaptures'] == 6
    assert technical['tables'] == 10
pattern = re.compile(r'mongodb\+srv://[^\s]+:[^\s]+@|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|gh[pousr]_[A-Za-z0-9]{20}')
for directory in ['docs', 'qa']:
    for file in (ROOT / directory).rglob('*'):
        if not file.is_file():
            continue
        assert file.suffix not in {'.gz', '.bson', '.zip', '.archive'}, 'Un respaldo no debe publicarse: ' + str(file)
        if file.suffix in {'.png', '.jpg', '.jpeg'}:
            with Image.open(file) as picture:
                picture.verify()
            continue
        if file.suffix == '.pdf':
            reader = PdfReader(file)
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
delivery = LATEST_MANUAL / 'verificacion-entrega.json'
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
    manual = PdfReader(LATEST_MANUAL / 'manual-usuario-sesha.pdf')
    assert len(manual.pages) == 11
    manual_text = '\n'.join(page.extract_text() or '' for page in manual.pages)
    assert '1.1. Cambiar la contraseña de acceso' in manual_text
    assert 'Guardar nueva contraseña' in manual_text
print('Archivos locales verificados: enlaces, copias PDF, evidencia y patrones de secretos. Sin publicación remota.')
