// scripts/test-parsers-runner.js
// Maps real file formats onto the actual parser code path (the SAME code Metro bundles for Android).
// Builds a CommonJS bundle from the source .ts files (babel preset-typescript), rewrites extensionless
// relative specifiers to real .js, then calls each parser's *FromBytes/:Text/:FromString function
// on real generated test fixtures and prints title/author/text + artifact checks.
// Runs: node scripts/test-parsers-runner.js   (from Sapphire root)
global.window = globalThis;
global.self = globalThis;
global.global = globalThis;
const FS = require('fs');
const PATH = require('path');
const { transformSync } = require('@babel/core');

const ROOT = PATH.resolve(__dirname, '..');
const SRC = PATH.resolve(ROOT, 'services');
const B = PATH.resolve(ROOT, '.test-parsers-bundle');
FS.rmSync(B, { recursive: true, force: true });
FS.mkdirSync(B, { recursive: true });

// ---- shim for the ONE extensionless "import '../i18n'" used by services/*.ts ----
// Node ESM cannot load a bare directory module, so provide a self-contained stub. The parse
// functions read tStatic only at call-time (never at module load), so the stub can safely
// return safe values and needs NO real i18n / settingsStore / AsyncStorage graph.
const SHIM_I18N = [
  '// TEST-SHORT: self-contained stub for "../i18n" (Node ESM cannot load a bare dir module).',
  "export const tStatic = () => '';",
  "export const useT = () => () => '';",
  "export const translateUi = () => () => '';",
  "export const resolveAppLang = () => 'en';",
].join('\n');

// ---- Node module override: expo-file-system is Native-only; provide a no-op FileSystem stub so
//      `import * as FileSystem from 'expo-file-system'` (used by parsers) resolves without the
//      native module / its broken .ts main. The *FromBytes parsers never call FileSystem. ----
const Module = require('module');
const fakeFileSystem = {
  documentDirectory: '/data/data/com.example/files',
  cacheDirectory: '/data/data/com.example/cache',
  EncodingType: { Base64: 'base64' },
  status: { OK: 0, W_ERR: 1, I_ERR: 2 },
  copyAsync: () => Promise.resolve({ uri: '' }),
  readAsStringAsync: () => Promise.resolve(''),
  writeAsStringAsync: () => Promise.resolve({ uri: '' }),
  deleteAsync: () => Promise.resolve(true),
  moveAsync: () => Promise.resolve({ uri: '' }),
  makeDirectoryAsync: () => Promise.resolve({ uri: '' }),
  readDirectoryAsync: () => Promise.resolve([]),
  existsAsync: () => Promise.resolve(false),
  getInfoAsync: () => Promise.resolve({ exists: false, size: 0 }),
};
// @react-native-async-storage (persist middleware) uses `window` in its CJS build under Node;
// provide a no-op driver so the REAL settingsStore/i18n/dict graph loads for testing.
const fakeAsyncStorage = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
  multiGet: () => Promise.resolve([]),
  multiSet: () => Promise.resolve(),
  multiRemove: () => Promise.resolve(),
  length: 0,
};
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'expo-file-system' || request === 'expo-file-system/legacy') {
    return fakeFileSystem;
  }
  if (request === '@react-native-async-storage/async-storage') {
    return fakeAsyncStorage;
  }
  return originalLoad.apply(this, arguments);
};

// ---- files to transform (same relative path, .js output) ----
const files = [];
// the 8 parsers under test
const parsers = ['rtfParser', 'fb2Parser', 'mobiParser', 'docxParser', 'odtParser', 'htmlParser', 'epubParser', 'zipParser'];
for (const p of parsers) files.push('services/' + p + '.ts');
files.push('services/i18n.ts'); // the i18n shim
const walkDir = (dir) => {
  for (const e of FS.readdirSync(PATH.join(ROOT, dir))) {
    const full = PATH.join(ROOT, dir, e);
    if (FS.statSync(full).isFile() && (e.endsWith('.ts') || e.endsWith('.tsx'))) {
      files.push(PATH.relative(ROOT, full).replace(/\\/g, '/'));
    }
  }
};
walkDir('utils');
walkDir('i18n');
files.push('store/createStore.ts');
files.push('store/settingsStore.ts');
files.push('theme/themes.ts');

// transform each file to CJS, strip types, save to bundle with same path
const transformed = new Set();
for (const rel of files) {
  let code = FS.readFileSync(PATH.join(ROOT, rel), 'utf8');
  if (rel === 'services/i18n.ts') code = SHIM_I18N; // use shim source
  const outRel = rel.replace(/\.tsx?$/, '.js');
  FS.mkdirSync(PATH.join(B, PATH.dirname(outRel)), { recursive: true });
  const out = transformSync(code, {
    filename: PATH.join(ROOT, rel),
    presets: ['@babel/preset-typescript'],
    generatorOpts: { compact: false },
  });
  FS.writeFileSync(PATH.join(B, outRel), out.code, 'utf8');
  transformed.add(outRel);
}

// expose every transformed module on a registry keyed by relative path
const registry = {};
for (const rel of transformed) {
  const mod = require(PATH.join(B, rel));
  registry[rel] = mod;
}

// ---- help: read a test fixture file ----
const fixturesDir = PATH.join(ROOT, 'data', 'test_files');
FS.mkdirSync(fixturesDir, { recursive: true });

async function writeFixtures() {
  // RTF: СИРІ Windows-1252 байти 0x80..0x9F + \'hh escapes -> verify no U+FFFD, curly quotes intact
  // (сирі байти, не UTF-8: інакше детектор кодування прийме їх за UTF-8)
  const win1252 = Buffer.from([
    0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x8b, 0x8c, 0x8d, 0x8e, 0x8f,
    0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0x9b, 0x9c, 0x9d, 0x9e, 0x9f,
  ]);
  const head = Buffer.from("{\\rtf1\\ansi\\ansicpg1252\n  \\b All Windows-1252 bytes: ", 'latin1');
  const tail = Buffer.from(
    "\n  \\par\n  Curly quotes from \\'93 \\'94 escapes: \"quoted\" 'single'\n  Ellipsis \\'85 En-dash \\'96 Em-dash \\'80 Euro \\'83\n  \\par\n  High bytes as \\'hh: \\'80 \\'81 \\'82 \\'83 \\'84 \\'85",
    'latin1',
  );
  FS.writeFileSync(PATH.join(fixturesDir, 'rtf.w1252.rtf'), Buffer.concat([head, win1252, tail]));

  FS.writeFileSync(PATH.join(fixturesDir, 'fb2.min.fb2'), [
    '<?xml version="1.0" encoding="UTF-8"?><!--FictionBook http://www.fictionbook.org-->',
    '<book><title>Тест</title><author><first-name>Иван</first-name><last-name>Петров</last-name></author>',
    '<body><p id="1">Однажды два слова: don\'t и café — юнікод. Вкладка 0x92 (заграв. апостроф).</p></body>',
    '</book>'].join('\n'), 'utf8');

  // DOCX minimal
  const docx = new (require('jszip'))();
  docx.file('word/document.xml', ['<?xml version="1.0" encoding="UTF-8"?>','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '<w:body><w:p><w:r><w:t>Document text with &amp; &lt; &gt; &#8220;quotes&#8221; &#233; é.</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>Second paragraph.</w:t></w:r></w:p></w:body></w:document>'].join('\n'), { createFolders: true });
  docx.file('docProps/core.xml', ['<?xml version="1.0" encoding="UTF-8"?>','<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/2.0/">',
    '<dc:title>Docx test</dc:title><dc:creator>Core Author</dc:creator></cp:coreProperties>'].join('\n'));
  const docxBuf = Buffer.from(await docx.generateAsync({ type: 'nodebuffer' }));
  FS.writeFileSync(PATH.join(fixturesDir, 'docx.min.docx'), docxBuf);

  // ODT minimal
  const odt = new (require('jszip'))();
  odt.file('content.xml', ['<?xml version="1.0" encoding="UTF-8"?>','<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">',
    '<office:body><office:text><text:p>ODT text with <text:span text:style-name="Taken">&amp; &#8217; smart quote &#8230;</text:span></text:p></office:text></office:body></office:document-content>'].join('\n'));
  odt.file('meta.xml', ['<?xml version="1.0" encoding="UTF-8"?>','<office:meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"><office:title>Odt test</office:title><dc:creator>Odt Author</dc:creator></office:meta>']);
  const odtBuf = Buffer.from(await odt.generateAsync({ type: 'nodebuffer' }));
  FS.writeFileSync(PATH.join(fixturesDir, 'odt.min.odt'), odtBuf);

  // HTML with numeric entities
  FS.writeFileSync(PATH.join(fixturesDir, 'html.min.html'), '<!DOCTYPE html><html><head><title>Html test</title></head><body><p>Test &amp; &#8220;double&#8221; &#8217;single&#8217; &#8230; &euro; &#233; é.</p></body></html>', 'utf8');

  // EPUB
  const zipEpub = new (require('jszip'))();
  zipEpub.file('META-INF/container.xml', '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebml+xml"/></rootfiles></container>');
  zipEpub.file('OEBPS/content.opf', '<package xmlns="http://www.idpf.org/2007/opf"><metadata><dc:title>Epub test</dc:title><dc:creator>Epub Author</dc:creator></metadata><manifest><item id="b" href="book.xhtml" media-type="text/xhtml"/></manifest><spine><itemref idref="b"/></spine></package>');
  zipEpub.file('OEBPS/book.xhtml', '<!DOCTYPE html><html><head><title>Book</title></head><body><p>Epub paragraph with &amp; &#8220;quotes&#8221; &#8230;<br/>second line.</p></body></html>');
  const epubBuf = Buffer.from(await zipEpub.generateAsync({ type: 'nodebuffer' }));
  FS.writeFileSync(PATH.join(fixturesDir, 'epub.min.epub'), epubBuf);

  // TXT
  FS.writeFileSync(PATH.join(fixturesDir, 'story.txt'), 'The quick brown fox jumps over the lazy dog.\nCafé au lait — with \'quotes\' and "dashes" — and 0x93 0x94.', 'utf8');

  // ZIP containing TXT + FB2
  const zipZip = new (require('jszip'))();
  zipZip.file('story.txt', 'Zip story: quick brown fox. Café — quotes.');
  zipZip.file('book.fb2', '<?xml version="1.0"?><book><title>Inside zip</title><author>Zip Author</author><body><p>Zip fb2 paragraph.</p></body></book>');
  const zipBuf = Buffer.from(await zipZip.generateAsync({ type: 'nodebuffer' }));
  FS.writeFileSync(PATH.join(fixturesDir, 'nested.zip'), zipBuf);

  // MOBI: PalmDOC/MOBI literal record. Layout that mobiParser expects:
  //   bytes 0..75 = 76-byte preamble (unused)
  //   bytes 76..77 = numRecords (big-endian)
  //   bytes 78..   = recordInfoList (8 bytes/record: offset(4)+attrs(1)+uniqueID(3))
  //     offsets[0] = PalmDOC header record location
  //     offsets[1..] = data records (raw literal bytes, no 8-byte header)
  const makeMobi = (text) => {
    const len = Buffer.byteLength(text, 'utf8');
    const total = 90 + len;
    const buf = Buffer.alloc(total);
    for (let i = 0; i < 76; i++) buf[i] = 0;
    buf.writeUInt16BE(2, 76); // numRecords = 2 (header + 1 data)
    buf.writeUInt32BE(8, 78); // offsets[0] = PalmDOC header record
    buf[82] = 0; buf[83] = 0; buf[84] = 0; // attrs + uniqueID
    buf.writeUInt32BE(90, 86); // offsets[1] = data record
    buf[90] = 0; buf[91] = 0; buf[92] = 0;
    // PalmDOC header (record 0) at offset 8: compression(2), [2 bytes gap], textLength(4), recordCount(2), recordSize(2)
    buf.writeUInt16BE(1, 8);           // compression = 1 (literal)
    buf.writeUInt32BE(len, 12);        // textLength
    buf.writeUInt16BE(1, 16);          // recordCount = 1
    buf.writeUInt16BE(len, 18);        // recordSize = text length
    // data record at offset 90: raw text bytes (ASCII literals)
    buf.write(text, 90, 'ascii');
    return buf;
  };
  FS.writeFileSync(PATH.join(fixturesDir, 'mobi.min.mobi'), makeMobi('MOBI minimal test one two'));

  // nested ZIP (EPUB inside)
  const innerEpub = new (require('jszip'))();
  innerEpub.file('mimetype', 'application/epub+zip');
  innerEpub.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OEBPS/inner.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  innerEpub.file('OEBPS/inner.opf', '<package><metadata><dc:title>Inner</dc:title></metadata><manifest><item id="i" href="inner.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="i"/></spine></package>');
  innerEpub.file('OEBPS/inner.xhtml', '<p>Inner epub content.</p>');
  const innerEpubBuf = Buffer.from(await innerEpub.generateAsync({ type: 'nodebuffer' }));
  const outerZip = new (require('jszip'))();
  outerZip.file('book.epub', innerEpubBuf);
  FS.writeFileSync(PATH.join(fixturesDir, 'epub_nested.zip'), Buffer.from(await outerZip.generateAsync({ type: 'nodebuffer' })));
}

// ---- parser entry registry ----
const BUNDLE = (p) => PATH.join(B, p);
// Each parser's pure function is called on real fixture bytes/text.
const entries = [
  { name: 'rtf',      fn: require(BUNDLE('services/rtfParser.js')).parseRtfFromBytes, file: 'rtf.w1252.rtf', isBytes: true, expect: 'Windows-1252' },
  { name: 'fb2',      fn: require(BUNDLE('services/fb2Parser.js')).parseFb2FromBytes, file: 'fb2.min.fb2', isBytes: false, expect: 'FictionBook' },
  { name: 'mobi',     fn: require(BUNDLE('services/mobiParser.js')).parseMobiFromBytes, file: 'mobi.min.mobi', isBytes: true, expect: 'Mobi' },
  { name: 'docx',     fn: require(BUNDLE('services/docxParser.js')).parseDocxFromBytes, file: 'docx.min.docx', isBytes: true, expect: 'Docx' },
  { name: 'odt',      fn: require(BUNDLE('services/odtParser.js')).parseOdtFromBytes, file: 'odt.min.odt', isBytes: true, expect: 'ODT' },
  { name: 'html',     fn: require(BUNDLE('services/htmlParser.js')).parseHtmlFromBytes, file: 'html.min.html', isBytes: false, expect: 'Html' },
  { name: 'epub',     fn: require(BUNDLE('services/epubParser.js')).parseEpubFromBytes, file: 'epub.min.epub', isBytes: true, expect: 'Epub' },
  { name: 'zip',      fn: require(BUNDLE('services/zipParser.js')).parseZipFromBytes, file: 'nested.zip', isBytes: true, expect: 'Zip' },
  { name: 'zipEpub',  fn: require(BUNDLE('services/zipParser.js')).parseZipFromBytes, file: 'epub_nested.zip', isBytes: true, expect: 'epub' },
];

function countUfff(s) { return (s.match(/\uFFFD/g) || []).length; }

async function main() {
  console.log('PARSER VERIFICATION — real fixtures, actual parser code (Node bundle)');
  await writeFixtures();
  for (const e of entries) {
    const txt = FS.readFileSync(PATH.join(fixturesDir, e.file));
    const fileBytes = txt.buffer.slice(txt.byteOffset, txt.byteOffset + txt.length);
    let result;
    try {
      if (e.isBytes) result = await e.fn(fileBytes);
      else result = await e.fn(fileBytes);
      const fbSlice = Buffer.from(fileBytes.slice(0, 40));
    console.log(`[dbg] ${e.name} file="${e.file}" len=${txt.length} fbLen=${fileBytes.byteLength} fbHex=${fbSlice.toString('hex')}`);
      const text = result.text ?? '';
      const ufff = countUfff(text);
      const ok = ufff === 0;
      console.log(`\n[${e.name}] ${e.file}`);
      console.log(`  title   : ${result.title ?? '(none)'}`);
      console.log(`  author  : ${result.author ?? '(none)'}`);
      console.log(`  text    : ${text.slice(0, 200).replace(/\n/g, ' | ')}`);
      console.log(`  U+FFFD  : ${ufff} ${ok ? 'OK (no artifacts)' : 'FAIL — mojibake/replacement chars'}`);
      if (!ok) console.log(`  full text: ${text.slice(0, 300)}`);
    } catch (err) {
      console.log(`[${e.name}] ERROR: ${err.message}\n${err.stack?.split('\n').slice(0, 3).join('\n')}`);
    }
  }

  // --- RTF character round-trip: every Windows-1252 byte 0x80..0x9F + \\xhh escapes ---
  console.log('\n' + 'RTF Win1252 round-trip — all 26 bytes 0x80..0x9F + \\xhh escapes');
  console.log('='.repeat(70));
  const rtf = FS.readFileSync(PATH.join(fixturesDir, 'rtf.w1252.rtf'));
  const parsed = await require(BUNDLE('services/rtfParser.js')).parseRtfFromBytes(rtf);
  const out = parsed.text;
  console.log(`title: ${parsed.title ?? '(none)'}`);
  const checks = {
    '0x80 -> € (EUR)': out.includes('\u20AC'),
    '0x85 -> … (ellipsis)': out.includes('\u2026'),
    '0x91 -> \u2018 (lsquo)': out.includes('\u2018'),
    '0x92 -> \u2019 (rsquo)': out.includes('\u2019'),
    '0x93 -> \u201C (ldquo)': out.includes('\u201C'),
    '0x94 -> \u201D (rdquo)': out.includes('\u201D'),
    '0x96 -> – (ndash)': out.includes('\u2013'),
    '0x97 -> — (mdash)': out.includes('\u2014'),
    '0x93 escaped via \\xhh': out.includes('\u201C'),
    '0x94 escaped via \\xhh': out.includes('\u201D'),
    '0x97 escaped via \\xhh': out.includes('\u2014'),
  };
  for (const [label, pass] of Object.entries(checks)) {
    console.log(`  ${label.padEnd(32)} : ${pass ? 'OK' : 'FAIL'}`);
  }
  const ufff = countUfff(out);
  console.log(`  U+FFFD count: ${ufff} ${ufff === 0 ? 'OK' : 'FAIL'}`);
  // explicit byte decode check: 0x93 should decode to U+201C not U+FFFD and not to '
  const idx93 = out.indexOf('\u201C');
  console.log(`  0x93 position: ${idx93} (should be the escaped open-double-quote)`);
  if (idx93 >= 0) {
    const around = out.slice(Math.max(0, idx93 - 30), Math.min(out.length, idx93 + 32));
    console.log(`  context: ${JSON.stringify(around)}`);
  }

  // --- RTF encoding regression: UTF-8 / cp1251 / \uN fallback (не регресити!) ---
  console.log('\n' + 'RTF encoding regression — UTF-8 / cp1251 / \\uN fallback');
  console.log('='.repeat(70));
  const encCases = [
    ['UTF-8 body (curly quotes + guillemets)',
      Buffer.from('{\\rtf1\\ansi «Hi» “world” ‘it’s’}', 'utf8'),
      ['«', '»', '“', '”', '‘', '’']],
    ['cp1251 raw Cyrillic',
      Uint8Array.from([0x7b, 0x5c, 0x72, 0x74, 0x66, 0x31, 0x5c, 0x61, 0x6e, 0x73, 0x69, 0x5c, 0x61, 0x6e, 0x73, 0x69, 0x63, 0x70, 0x67, 0x31, 0x32, 0x35, 0x31, 0xcf, 0xf0, 0xe8, 0xe2, 0xb3, 0xf2, 0x7d]),
      ['П', 'р', 'и', 'в', 'і', 'т']],
    ['\\uN + letter fallback (fallback не тече)',
      Uint8Array.from([...'{\\rtf1\\ansi a \\u8220z b}'].map((c) => c.charCodeAt(0))),
      ['a “b']],
    ['\\uN + backslash next (контрольне слово не з\'їдене)',
      Uint8Array.from([...'{\\rtf1\\ansi a \\u8220\\par b}'].map((c) => c.charCodeAt(0))),
      ['a “\nb']],
  ];
  for (const [label, buf, expects] of encCases) {
    const r = await require(BUNDLE('services/rtfParser.js')).parseRtfFromBytes(buf);
    const missing = expects.filter((e) => !r.text.includes(e));
    console.log(`  ${label.padEnd(46)} : ${missing.length === 0 ? 'OK' : 'FAIL missing=' + JSON.stringify(missing)}`);
    if (missing.length) console.log(`      got: ${JSON.stringify(r.text)}`);
  }

  // zip innerFormat detection for nested epub
  // (Buffer.buffer — це pooled ArrayBuffer з offset, тому беремо точний зріз)
  const zipBuf = FS.readFileSync(PATH.join(fixturesDir, 'epub_nested.zip'));
  const zipAb = zipBuf.buffer.slice(zipBuf.byteOffset, zipBuf.byteOffset + zipBuf.byteLength);
  const z = await require(BUNDLE('services/zipParser')).parseZipFromBytes(zipAb);
  console.log(`\nZIP nested EPUB -> text="${z.text.slice(0, 60)}", innerFormat="${z.innerFormat}"`);
}

(async () => { try { await main(); } catch (e) { console.error('FATAL', e); process.exit(1); } })();
