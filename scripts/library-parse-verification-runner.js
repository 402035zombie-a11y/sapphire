// LIBRARY PARSE VERIFICATION RUNNER — maps real file formats onto the actual parser code path (same code Metro bundles for Android).
// Builds a CommonJS bundle from the source .ts files (babel preset-typescript), rewrites extensionless relative specifiers to real .js paths,
// then calls each parser's *FromBytes/:Text/:FromString function on REAL generated test fixtures and prints text/title/author + U+FFFD checks.
// Runs: node scripts/library-parse-verification-runner.js   (from BookReader root)
const FS = require('fs');
const PATH = require('path');
const { transformSync } = require('@babel/core');

const ROOT = PATH.resolve(__dirname, '..');
const B = PATH.resolve(ROOT, '.library-parse-bundle');
FS.rmSync(B, { recursive: true, force: true });
FS.mkdirSync(B, { recursive: true });

// ---- shim for the ONE extensionless import '../i18n' (Node ESM can't load a bare dir module) ----
const SHIM_I18N = [
  '// TEST-SHORT: self-contained stub for "../i18n" (Node ESM can not load a bare dir module).',
  'export const tStatic = () => "";',
  'export const useT = () => () => "";',
  'export const translateUi = () => () => "";',
  "export const resolveAppLang = () => 'en';",
].join('\n');

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
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'expo-file-system' || request === 'expo-file-system/legacy') return fakeFileSystem;
  if (request === '@react-native-async-storage/async-storage') return { getItem: () => Promise.resolve(null), setItem: () => Promise.resolve(), removeItem: () => Promise.resolve() };
  return originalLoad.apply(this, arguments);
};

// ---- files to transform: the library FETCH parsers under test, + transitive i18n+utils ----
const files = [];
const parsers = ['rtfParser', 'fb2Parser', 'mobiParser', 'docxParser', 'odtParser', 'htmlParser', 'epubParser', 'zipParser'];
for (const p of parsers) files.push('services/' + p + '.ts');
files.push('services/i18n.ts');

const walkDir = (dir) => {
  for (const e of FS.readdirSync(PATH.join(ROOT, dir))) {
    if (FS.statSync(PATH.join(ROOT, dir, e)).isFile() && (e.endsWith('.ts') || e.endsWith('.tsx'))) {
      files.push(PATH.relative(ROOT, PATH.join(dir, e)).replace(/\\/g, '/'));
    }
  }
};
walkDir('i18n');
walkDir('utils');

// ---- build bundle ----
const transformed = new Set();
const B = PATH.resolve(ROOT, '.parse-bundle');
FS.rmSync(B, { recursive: true, force: true });
FS.mkdirSync(B, { recursive: true });
for (const rel of files) {
  const code = rel === 'services/i18n.ts' ? SHIM_I18N : FS.readFileSync(PATH.join(ROOT, rel), 'utf8');
  const outRel = rel.replace(/\.tsx?$/, '.js');
  const out = transformSync(code, { filename: PATH.join(ROOT, rel), presets: ['@babel/preset-typescript'] });
  FS.mkdirSync(PATH.join(B, PATH.dirname(outRel)), { recursive: true });
  FS.writeFileSync(PATH.join(B, outRel), out.code, 'utf8');
  transformed.add(outRel);
}
for (const rel of transformed) {
  const src = FS.readFileSync(PATH.join(B, rel), 'utf8');
  const precise = src.replace(/['"]((\.\.?[\/][^'"]*?)['"])/g, (m, spec) => {
    if (spec.startsWith('.') && spec.includes('..') === false && !/\.[^.]+$/.test(spec)) {
      return `'${spec}.js'`;
    }
    if (spec.startsWith('.')) return `'${spec}.js'`;
    return m;
  });
  FS.writeFileSync(PATH.join(B, rel), precise, 'utf8');
}
const registry = {};
for (const rel of transformed) {
  const mod = require(PATH.join(B, rel));
  registry[rel] = mod;
}

// ---- fixtures (real files, UTF-8 text on disk) ----
const fixturesDir = PATH.join(ROOT, 'data', 'test_files');
const fs2 = require('fs');
function readText(name) { return fs2.readFileSync(PATH.join(fixturesDir, name), 'utf8'); }
const fixtures = {
  rtf: { file: 'rtf.w1252.rtf', isBytes: true },
  fb2: { file: 'fb2.min.fb2', isBytes: false, isString: true },
  mobi: { file: 'mobi.min.mobi', isBytes: true },
  docx: { file: 'docx.min.docx', isBytes: true },
  odt: { file: 'odt.min.odt', isBytes: true },
  html: { file: 'html.min.html', isBytes: false, isString: true },
  epub: { file: 'epub.min.epub', isBytes: true },
  zip: { file: 'nested.zip', isBytes: true },
};

const EXPECTED = {
  rtf: { title: 'DocReader', author: 'DocReader', text: 'The quick brown fox jumps over the lazy dog.' },
  fb2: { title: 'Тест', author: 'Иван Петров', text: 'Однажды два слова: don\'t и café — юнікод.' },
  mobi: { title: 'Mobi minimal test one two', text: 'Mobi minimal test one two' },
  docx: { title: 'Docx test', author: 'Core Author', text: 'Document text with & "quotes" é é. | Second paragraph.' },
  odt: { title: 'Odt test', text: 'ODT text with & \' smart quote …' },
  html: { title: 'Html test', text: 'Html test | Test "quotes" \'single\' … € é.' },
  epub: { title: 'Epub test', author: 'Epub Author', text: 'Book | Epub paragraph with "quotes" … | second line.' },
  zip: { text: 'Zip fb2 paragraph.', innerFormat: 'TXT' },
};

// ---- run ----
(async () => {
  console.log('LIBRARY PARSE VERIFICATION — real fixtures, actual parser code (Node bundle)');
  console.log('='.repeat(70));
  for (const [name, cfg] of Object.entries(fixtures)) {
    const raw = fs2.readFileSync(PATH.join(fixturesDir, cfg.file));
    let result;
    try {
      const fn = registry[cfg.file + 'Parser'] ?? (cfg.isBytes ? require('./services/' + name.toLowerCase() + 'Parser') : require('./services/' + name.toLowerCase() + 'Parser'));
      // resolve parser entry
      const entry = require(PATH.join(B, 'services', cfg.file.replace(/\.[^.]+$/, '') + 'Parser'));
      let fn2;
      if (typeof entry === 'function') fn2 = entry;
      else if (entry.default) fn2 = entry.default;
      else fn2 = entry;
      // pick function
      const ifBytes = cfg.isBytes;
      const ifString = cfg.isString;
      const fn2name = Object.keys(fn2 || {}).find(k => typeof fn2[k] === 'function');
      const fn = fn2[fn2name] || fn2;
      if (ifBytes) result = await fn(raw.buffer);
      else if (ifString) result = await fn(raw);
      else result = await fn(raw);
    } catch (e) {
      console.log(`[${name}] ERROR: ${e.message}`);
      continue;
    }
    const text = result?.text ?? '';
    const title = result?.title ?? '';
    const author = result?.author ?? '';
    const ufff = (text.match(/\uFFFD/g) || []).length;
    const ok = ufff === 0;
    console.log(`\n[${name}] ${cfg.file}`);
    console.log(`  title   : ${title ?? '(none)'}`);
    console.log(`  author  : ${author ?? '(none)'}`);
    console.log(`  text    : ${text.slice(0, 180).replace(/\n/g, ' | ')}`);
    console.log(`  U+FFFD  : ${ufff} ${ok ? 'OK (no artifacts)' : 'FAIL — mojibake/replacement chars'}`);
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
