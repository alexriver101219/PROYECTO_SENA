"""Verifica enlaces, copias PDF y ausencia de formatos habituales de secretos."""
from pathlib import Path
from html.parser import HTMLParser
import re
import json
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
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
        if file.suffix == '.pdf':
            reader = PdfReader(file)
            text = '\n'.join(p.extract_text() or '' for p in reader.pages)
            assert all(len(p.extract_text() or '') > 100 for p in reader.pages)
            assert file.read_bytes() == (ROOT / 'output/pdf' / file.name).read_bytes()
        else:
            text = file.read_text(encoding='utf-8')
        assert not pattern.search(text), 'Revisar posible secreto: ' + str(file.relative_to(ROOT))
data = json.loads((ROOT / 'docs/pruebas/2026-11-13/resultados.json').read_text(encoding='utf-8'))
assert data['functional']['passed'] == data['functional']['total'] == 77
assert data['performance']['sustained']['targetRps'] == 50
assert data['security']['riskCounts'] == {'high':0, 'medium':1, 'low':1, 'informational':4}
print('Publicación verificada: enlaces locales, 3 copias PDF, resultados y patrones de secretos.')
