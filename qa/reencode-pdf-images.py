"""Reencode ASCII85+Flate PDF images as binary Flate without changing pixels.

Usage: python qa/reencode-pdf-images.py INPUT.pdf OUTPUT.pdf
Requires pypdf. The output must be a new file. Never suppress secret scanning.
"""
import argparse
import hashlib
import json
from pathlib import Path
import zlib
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    if args.destination.exists() or args.source.resolve() == args.destination.resolve():
        parser.error('The output must be a new file')
    reader = PdfReader(args.source)
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    changed = []
    seen = set()
    for number, page in enumerate(writer.pages, 1):
        objects = page.get('/Resources', {}).get('/XObject', {})
        for ref in objects.values():
            obj = ref.get_object()
            if id(obj) in seen or obj.get('/Subtype') != '/Image':
                continue
            seen.add(id(obj))
            filters = obj.get('/Filter', [])
            filters = [str(filters)] if isinstance(filters, str) else [str(x) for x in filters]
            if filters != ['/ASCII85Decode', '/FlateDecode']:
                continue
            if obj.get('/DecodeParms'):
                raise ValueError('Image predictors require a separate reviewed conversion')
            pixels = obj.get_data()
            # Replace the encoded payload in place so no orphaned ASCII85 copy remains.
            obj._data = zlib.compress(pixels, level=9)
            obj[NameObject('/Filter')] = NameObject('/FlateDecode')
            obj.pop('/DecodeParms', None)
            changed.append({'page': number, 'decodedSha256': hashlib.sha256(pixels).hexdigest()})
    if not changed:
        raise ValueError('No ASCII85+Flate images found')
    with args.destination.open('xb') as stream:
        writer.write(stream)
    updated = PdfReader(args.destination)
    assert len(updated.pages) == len(reader.pages)
    for before, after in zip(reader.pages, updated.pages):
        old = before.get('/Resources', {}).get('/XObject', {})
        new = after.get('/Resources', {}).get('/XObject', {})
        assert set(old) == set(new)
        for name in old:
            assert old[name].get_object().get_data() == new[name].get_object().get_data()
        assert list(before.mediabox) == list(after.mediabox)
        assert len(before.get('/Annots', [])) == len(after.get('/Annots', []))
    print(json.dumps({'pages': len(updated.pages), 'imagesReencoded': len(changed),
                      'imagePixelsUnchanged': True, 'bytes': args.destination.stat().st_size}))


if __name__ == '__main__':
    main()
