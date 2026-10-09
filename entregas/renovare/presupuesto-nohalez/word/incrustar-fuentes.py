"""Incrusta Inter y EB Garamond en el .docx para que se vea igual en cualquier ordenador.

Uso: python3 incrustar-fuentes.py ["ruta.docx"]
Sigue el mecanismo estándar de Office (ECMA-376 §17.8.1): fuentes .odttf ofuscadas con la
clave GUID de su entrada en fontTable.xml, más <w:embedTrueTypeFonts/> en settings.xml.
"""
import os, re, sys, uuid, zipfile

AQUI = os.path.dirname(os.path.abspath(__file__))
DOCX = sys.argv[1] if len(sys.argv) > 1 else os.path.join(AQUI, '..', 'PRESUPUESTO NOHALEZ - SV-0045-03.docx')
FUENTES = os.path.join(AQUI, 'fonts')

# familia en Word → {variante: archivo}
FAMILIAS = {
    'Inter': {'Regular': 'Inter-Regular.ttf', 'Bold': 'Inter-Bold.ttf'},
    'Inter Medium': {'Regular': 'Inter-Medium.ttf'},
    'Inter SemiBold': {'Regular': 'Inter-SemiBold.ttf'},
    'EB Garamond Medium': {'Regular': 'EBGaramond-Medium.ttf', 'Italic': 'EBGaramond-MediumItalic.ttf'},
}
NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
REL_FONT = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/font'


def ofuscar(datos: bytes, guid: str) -> bytes:
    clave = bytes.fromhex(guid.strip('{}').replace('-', ''))[::-1]
    d = bytearray(datos)
    for i in range(32):
        d[i] ^= clave[i % 16]
    return bytes(d)


def main():
    with zipfile.ZipFile(DOCX) as z:
        partes = {n: z.read(n) for n in z.namelist()}

    fuentes_xml, rels, n = [], [], 0
    for familia, variantes in FAMILIAS.items():
        embeds = []
        for variante, archivo in variantes.items():
            n += 1
            guid = '{' + str(uuid.uuid4()).upper() + '}'
            with open(os.path.join(FUENTES, archivo), 'rb') as f:
                partes[f'word/fonts/font{n}.odttf'] = ofuscar(f.read(), guid)
            rels.append(f'<Relationship Id="rId{n}" Type="{REL_FONT}" Target="fonts/font{n}.odttf"/>')
            embeds.append(f'<w:embed{variante} r:id="rId{n}" w:fontKey="{guid}"/>')
        tipo = 'roman' if 'Garamond' in familia else 'swiss'
        fuentes_xml.append(f'<w:font w:name="{familia}"><w:charset w:val="00"/><w:family w:val="{tipo}"/>'
                           f'<w:pitch w:val="variable"/>{"".join(embeds)}</w:font>')
    fuentes_xml.append('<w:font w:name="Arial"><w:charset w:val="00"/><w:family w:val="swiss"/><w:pitch w:val="variable"/></w:font>')

    partes['word/fontTable.xml'] = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<w:fonts xmlns:w="{NS_W}" xmlns:r="{NS_R}">{"".join(fuentes_xml)}</w:fonts>').encode()
    partes['word/_rels/fontTable.xml.rels'] = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        f'{"".join(rels)}</Relationships>').encode()

    ct = partes['[Content_Types].xml'].decode()
    if 'Extension="odttf"' not in ct:
        ct = ct.replace('<Default ', '<Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/><Default ', 1)
    if '/word/fontTable.xml' not in ct:
        ct = ct.replace('</Types>', '<Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/></Types>')
    partes['[Content_Types].xml'] = ct.encode()

    drels = partes['word/_rels/document.xml.rels'].decode()
    if 'fontTable.xml' not in drels:
        drels = drels.replace('</Relationships>', '<Relationship Id="rIdFuentes" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/></Relationships>')
        partes['word/_rels/document.xml.rels'] = drels.encode()

    st = partes['word/settings.xml'].decode()
    if 'embedTrueTypeFonts' not in st:
        # Orden del esquema: el elemento va tras el último de estos hermanos previos que exista
        previos = ['writeProtection', 'view', 'zoom', 'removePersonalInformation', 'removeDateAndTime',
                   'doNotDisplayPageBoundaries', 'displayBackgroundShape', 'printPostScriptOverText',
                   'printFractionalCharacterWidth', 'printFormsData']
        fin = None
        for el in previos:
            m = re.search(rf'<w:{el}\b[^>]*/>|<w:{el}\b.*?</w:{el}>', st, re.S)
            if m:
                fin = m.end()
        tag = '<w:embedTrueTypeFonts/>'
        st = st[:fin] + tag + st[fin:] if fin else re.sub(r'(<w:settings[^>]*>)', lambda m: m.group(1) + tag, st, count=1)
        partes['word/settings.xml'] = st.encode()

    tmp = DOCX + '.tmp'
    with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', partes.pop('[Content_Types].xml'))
        for nombre, datos in partes.items():
            z.writestr(nombre, datos)
    os.replace(tmp, DOCX)
    print(f'Fuentes incrustadas ({n} archivos) en {DOCX}')


if __name__ == '__main__':
    main()
