// Builds a tiny EPUB whose cover is the lock screen image. A Kindle with Display
// Cover turned on shows the current book's cover as its lock screen.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// Uncompressed (stored) ZIP. EPUB requires the mimetype entry to be stored,
// and the only large entry is a JPEG, which would not compress anyway.
export function zipStore(files) {
  const encoder = new TextEncoder();
  const DOS_DATE = 0x21; // 1980-01-01
  const local = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const size = file.data.length;

    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);
    lh.setUint16(12, DOS_DATE, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, size, true);
    lh.setUint32(22, size, true);
    lh.setUint16(26, name.length, true);
    local.push(new Uint8Array(lh.buffer), name, file.data);

    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint16(14, DOS_DATE, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, size, true);
    ch.setUint32(24, size, true);
    ch.setUint16(28, name.length, true);
    ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name);

    offset += 30 + name.length + size;
  }

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  const parts = [...local, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(offset + centralSize + 22);
  let pos = 0;
  for (const part of parts) {
    out.set(part, pos);
    pos += part.length;
  }
  return out;
}

function escapeXml(text) {
  return text.replace(/[<>&"']/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[ch]);
}

function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 3) | 8).toString(16);
  });
}

// Amazon's Send to Kindle converts the EPUB before delivering it. It has to see an
// ordinary reflowable book: no viewport meta (that marks a fixed-layout page and made
// Amazon fall back to a PDF-like document with no cover, error E016), a page of real
// text, and both the EPUB 3 nav and the older NCX contents.
export function buildEpub(jpegBytes, { title = 'Lock Screen' }) {
  const text = (s) => new TextEncoder().encode(s);
  const safeTitle = escapeXml(title);
  const id = `urn:uuid:${uuid()}`;
  const modified = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const page = (pageTitle, body, bodyAttrs = '') => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${pageTitle}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body${bodyAttrs}>
${body}
</body>
</html>`;

  const container = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="en">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${id}</dc:identifier>
    <dc:title>${safeTitle}</dc:title>
    <dc:creator>Kindle Lock Screens</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${modified}</meta>
    <meta name="cover" content="cover-image"/>
  </metadata>
  <manifest>
    <item id="cover-image" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="about" href="about.xhtml" media-type="application/xhtml+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="cover"/>
    <itemref idref="about"/>
  </spine>
</package>`;

  const css = `body { margin: 0; padding: 0; }
.cover { text-align: center; }
.cover img { max-width: 100%; height: auto; }
h1 { text-align: center; }
`;

  const cover = page(
    safeTitle,
    `  <div class="cover"><img src="cover.jpg" alt="${safeTitle}"/></div>`,
  );

  const about = page(
    safeTitle,
    `  <h1>${safeTitle}</h1>
  <p>This little book exists so that its cover can be the lock screen of your Kindle.</p>
  <p>To use it, turn on Display Cover in your Kindle's settings. Your Kindle shows the cover of the book you opened most recently, so open this one again whenever you want your lock screen back.</p>`,
  );

  const nav = page(
    safeTitle,
    `  <nav epub:type="toc">
    <h1>Contents</h1>
    <ol>
      <li><a href="cover.xhtml">Cover</a></li>
      <li><a href="about.xhtml">${safeTitle}</a></li>
    </ol>
  </nav>`,
  );

  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${id}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${safeTitle}</text></docTitle>
  <navMap>
    <navPoint id="cover" playOrder="1"><navLabel><text>Cover</text></navLabel><content src="cover.xhtml"/></navPoint>
    <navPoint id="about" playOrder="2"><navLabel><text>${safeTitle}</text></navLabel><content src="about.xhtml"/></navPoint>
  </navMap>
</ncx>`;

  return zipStore([
    { name: 'mimetype', data: text('application/epub+zip') },
    { name: 'META-INF/container.xml', data: text(container) },
    { name: 'OEBPS/content.opf', data: text(opf) },
    { name: 'OEBPS/cover.xhtml', data: text(cover) },
    { name: 'OEBPS/about.xhtml', data: text(about) },
    { name: 'OEBPS/nav.xhtml', data: text(nav) },
    { name: 'OEBPS/toc.ncx', data: text(ncx) },
    { name: 'OEBPS/style.css', data: text(css) },
    { name: 'OEBPS/cover.jpg', data: jpegBytes },
  ]);
}
