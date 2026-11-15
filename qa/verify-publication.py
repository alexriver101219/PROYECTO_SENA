"""Verifica enlaces, copias PDF y ausencia de formatos habituales de secretos."""
from pathlib import Path
from html.parser import HTMLParser
import re
import json
from pypdf import PdfReader
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LATEST_MANUAL = ROOT / 'docs/manual/2026-11-14'
class Links(HTMLParser):
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key == 'href' and not value.startswith(('https:', '#')):
                assert (ROOT / 'docs' / value).is_file(), 'Enlace local inexistente: ' + value
Links().feed((ROOT / 'docs/index.html').read_text(encoding='utf-8'))
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
            if file.name != 'manual-usuario-sesha.pdf' or file.parent == LATEST_MANUAL:
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
delivery = LATEST_MANUAL / 'verificacion-entrega.json'
if delivery.exists():
    evidence = json.loads(delivery.read_text(encoding='utf-8'))
    assert evidence['backup']['passed']
    assert sum(item['documents'] for item in evidence['backup']['checks']) == 304
    assert sum(item['indexes'] for item in evidence['backup']['checks']) == 11
    assert evidence['apiCheck']['fixturesRemoved'] and evidence['apiCheck']['bytesMatch']
    assert evidence['visualReview']['mobile']['physicalDeviceTested'] is False
    update = evidence['passwordChangeUpdate']
    assert update['requiresCurrentPassword'] and update['previousSessionsRevokedOnSuccess']
    assert update['passwordMinimumCharacters'] == 12 and update['passwordMaximumUtf8Bytes'] == 72
    assert update['credentialsEnteredForDocumentation'] is False
    assert update['productionAccountsChangedForDocumentation'] is False
    assert update['deploymentPending'] and evidence['applicationChangesPublished'] is False
    manual = PdfReader(LATEST_MANUAL / 'manual-usuario-sesha.pdf')
    assert len(manual.pages) == 11
    manual_text = '\n'.join(page.extract_text() or '' for page in manual.pages)
    assert '1.1. Cambiar la contraseña de acceso' in manual_text
    assert 'Guardar nueva contraseña' in manual_text
print('Archivos locales verificados: enlaces, copias PDF, evidencia y patrones de secretos. Sin publicación remota.')
