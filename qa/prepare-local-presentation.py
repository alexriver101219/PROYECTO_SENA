"""Adapta la guía local a los nombres únicos, sin modificar las copias públicas."""
from pathlib import Path
from zipfile import ZipFile
from deliverable_paths import LOCAL_PRESENTATION_NAMES

root = Path(__file__).resolve().parent.parent
public = root / 'docs/presentacion/2026-11-15'
output = root / 'output/presentacion'
for public_name, local_name in LOCAL_PRESENTATION_NAMES.items():
    assert (public / public_name).read_bytes() == (output / local_name).read_bytes()
guide = (public / 'guia-ensayo.html').read_text(encoding='utf-8')
with ZipFile(public / 'SESHA-paquete-exposicion.zip') as archive:
    readme = archive.read('SESHA-exposicion/LEEME-EXPOSICION.txt').decode('utf-8')
for public_name, local_name in LOCAL_PRESENTATION_NAMES.items():
    guide = guide.replace(public_name, local_name)
    readme = readme.replace(public_name, local_name)
(output / 'guia-ensayo.html').write_text(guide, encoding='utf-8', newline='\n')
(output / 'LEEME-EXPOSICION.txt').write_text(readme, encoding='utf-8', newline='\n')
print('Guía y lista de archivos locales enlazadas a las versiones actualizadas.')
