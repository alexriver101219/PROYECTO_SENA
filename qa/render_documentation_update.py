"""Render y hojas de revisión privadas de la edición documental vigente."""
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / '.qa/documentation-2026-11-15/render'
OUT.mkdir(parents=True, exist_ok=True)
BINARY = ROOT / '.qa/tools/poppler/poppler-26.09.0/Library/bin/pdftoppm.exe'
for name in ['manual-usuario-sesha', 'informe-tecnico-consolidado-sesha']:
    subprocess.run([str(BINARY), '-r', '96', '-png', str(ROOT / 'output/pdf' / (name + '.pdf')), str(OUT / name)], check=True, capture_output=True)
    pages = sorted(OUT.glob(name + '-[0-9]*.png'))
    columns = 2 if name.startswith('manual') else 3
    cell = (560, 420) if columns == 2 else (360, 530)
    count = 6 if columns == 2 else 9
    for start in range(0, len(pages), count):
        selected = pages[start:start + count]
        sheet = Image.new('RGB', (columns * cell[0], ((len(selected) + columns - 1) // columns) * cell[1]), '#ced9e0')
        draw = ImageDraw.Draw(sheet)
        for index, page in enumerate(selected):
            x, y = (index % columns) * cell[0], (index // columns) * cell[1]
            draw.text((x + 8, y + 3), 'Página ' + str(start + index + 1), fill='black')
            picture = ImageOps.contain(Image.open(page), (cell[0] - 12, cell[1] - 26))
            sheet.paste(picture, (x + 6, y + 20))
        sheet.save(OUT / (name + f'-contact-{start // count + 1}.png'))
    print(name, len(pages))
