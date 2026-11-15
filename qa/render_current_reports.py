"""Renderiza los PDF públicos actuales y produce hojas de revisión privadas."""
import os
import re
import subprocess
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
date = os.environ.get('REPORT_DATE', '2026-11-15')
assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', date)
source = ROOT / 'docs/pruebas' / date
output = ROOT / '.qa' / f'reports-{date}' / 'render'
output.mkdir(parents=True, exist_ok=True)
binary = ROOT / '.qa/tools/poppler/poppler-26.09.0/Library/bin/pdftoppm.exe'
for pdf in sorted(source.glob('informe-*.pdf')):
    prefix = output / pdf.stem
    page_pattern = re.compile(re.escape(pdf.stem)+r'-\d+\.png')
    for old in output.iterdir():
        if old.is_file() and page_pattern.fullmatch(old.name):
            assert old.resolve().parent == output.resolve()
            old.unlink()
    subprocess.run([str(binary), '-r', '72', '-png', str(pdf), str(prefix)], check=True, capture_output=True)
    pages = sorted(output.glob(pdf.stem+'-*.png'))
    # El patrón de páginas no incluye las hojas de contacto.
    pages = [file for file in pages if page_pattern.fullmatch(file.name)]
    sheet = Image.new('RGB', (750, ((len(pages)+2)//3)*355), '#d1d8de')
    draw = ImageDraw.Draw(sheet)
    for index, page in enumerate(pages):
        sheet.paste(ImageOps.contain(Image.open(page), (240, 332)), ((index%3)*250+5, (index//3)*355+20))
        draw.text(((index%3)*250+7, (index//3)*355+4), 'Página '+page.stem.rsplit('-', 1)[-1], fill='black')
    sheet.save(output/(pdf.stem+'-contact.png'))
    print(pdf.name, len(pages))
