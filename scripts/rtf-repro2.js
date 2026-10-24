// scripts/rtf-repro2.js — реалістичні RTF-кейси (кодування, що дають книги).
global.window = globalThis;
global.self = globalThis;
global.global = globalThis;
const FS = require('fs');
const PATH = require('path');
const { transformSync } = require('@babel/core');

const ROOT = PATH.resolve(__dirname, '..');
const B = PATH.join(ROOT, '.rtf-repro-bundle');
const Module = require('module');
const fakeFileSystem = { cacheDirectory: '/c/', documentDirectory: '/d/', EncodingType: { Base64: 'base64' }, copyAsync: () => Promise.resolve({ uri: '' }), readAsStringAsync: () => Promise.resolve('') };
const orig = Module._load;
Module._load = function (r, p, m) {
  if (r === 'expo-file-system' || r === 'expo-file-system/legacy') return fakeFileSystem;
  return orig.apply(this, arguments);
};

const src = FS.readFileSync(PATH.join(ROOT, 'services', 'rtfParser.ts'), 'utf8');
FS.mkdirSync(B, { recursive: true });
FS.writeFileSync(PATH.join(B, 'i18n.js'), "export const tStatic = () => '';", 'utf8');
const out = transformSync(src, { filename: 'rtfParser.ts', presets: ['@babel/preset-typescript'], generatorOpts: { compact: false } });
FS.writeFileSync(PATH.join(B, 'rtfParser.js'), out.code, 'utf8');
const { parseRtfFromBytes } = require(PATH.join(B, 'rtfParser.js'));

const hex = (s) => [...s].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0') + '(' + c + ')').join(' ');
// замінює недруковане на позначку
const vis = (s) => s.replace(/[\u0080-\u009f\uFFFD]/g, '�');

const cases = [];
const add = (name, buf) => cases.push([name, buf]);

// 1) cp1252 raw + \'93/\'94 (західна книга)
{
  const b = [0x7b,0x5c,0x72,0x74,0x66,0x31,0x5c,0x61,0x6e,0x73,0x69,0x5c,0x61,0x6e,0x73,0x69,0x63,0x70,0x67,0x31,0x32,0x35,0x32];
  const txt = [..."Hello \\'93world\\'94 and \\'91it\\'92s\\'92 ok"].map((c) => c.charCodeAt(0));
  const end = [0x7d];
  add('cp1252 raw + hex quotes', Uint8Array.from([...b, ...txt, ...end]));
}
// 2) cp1251 raw Cyrillic + \'93 quotes
{
  const b = [0x7b,0x5c,0x72,0x74,0x66,0x31,0x5c,0x61,0x6e,0x73,0x69,0x5c,0x61,0x6e,0x73,0x69,0x63,0x70,0x67,0x31,0x32,0x35,0x31];
  const cyr = [0xcf, 0xf0, 0xe8, 0xe2, 0xb3, 0xf2, 0x20]; // "Привіт " у cp1251
  const q = [0x5c,0x27,0x39,0x33];            // \'93
  const rest = [0xf1, 0xe2, 0xb3, 0xf2]; // "світ" у cp1251
  const rd = [0x5c,0x27,0x39,0x34];           // \'94
  add('cp1251 raw Cyrillic + hex quotes', Uint8Array.from([...b, ...cyr, ...q, ...rest, ...rd, 0x7d]));
}
// 3) UTF-8 file (сучасний writer)
{
  const s = "{\\rtf1\\ansi «Hello» “world” ‘it’s’";
  const bytes = [...s].flatMap((c) => {
    const n = c.codePointAt(0);
    if (n < 0x80) return [n];
    if (n < 0x800) return [0xc0 | (n >> 6), 0x80 | (n & 0x3f)];
    if (n < 0x10000) return [0xe0 | (n >> 12), 0x80 | ((n >> 6) & 0x3f), 0x80 | (n & 0x3f)];
    return [0xf0 | (n >> 18), 0x80 | ((n >> 12) & 0x3f), 0x80 | ((n >> 6) & 0x3f), 0x80 | (n & 0x3f)];
  });
  add('UTF-8 file (guillemets + curly)', Uint8Array.from([...bytes, 0x7d]));
}
// 4) \uN with ? fallback
{
  const s = "{\\rtf1\\ansi before \\u8220? after \\u8216? x \\u8217? y}";
  add('\\uN + "?" fallback', Uint8Array.from([...s].map((c) => c.charCodeAt(0))));
}
// 5) \uN with letter fallback
{
  const s = "{\\rtf1\\ansi before \\u8220z after}";
  add('\\uN + LETTER fallback', Uint8Array.from([...s].map((c) => c.charCodeAt(0))));
}
// 6) \uN with NO fallback, next is control word
{
  const s = "{\\rtf1\\ansi before \\u8220\\par after}";
  add('\\uN + backslash next', Uint8Array.from([...s].map((c) => c.charCodeAt(0))));
}
// 7) \uN with high-byte fallback (cp1251 0x93)
{
  const b = [0x7b,0x5c,0x72,0x74,0x66,0x31,0x5c,0x61,0x6e,0x73,0x69];
  const mid = [..." before \\u8220"].map((c) => c.charCodeAt(0));
  const fb = [0x93];                          // fallback byte
  const tail = [..." after}"].map((c) => c.charCodeAt(0));
  add('\\uN + 0x93 fallback', Uint8Array.from([...b, ...mid, ...fb, ...tail]));
}
// 8) realistic Calibre-style: \uN + ? for everything
{
  const s = "{\\rtf1\\ansi\\ansicpg1252 \\u8220?\\u72?\\u101?\\u116?\\u101?\\u114?\\u8221? \\u8212? end}";
  add('Calibre-style \\uN? sequence', Uint8Array.from([...s].map((c) => c.charCodeAt(0))));
}

(async () => {
  for (const [name, buf] of cases) {
    try {
      const r = await parseRtfFromBytes(buf);
      console.log(`\n[${name}]`);
      console.log(`  out : ${vis(r.text)}`);
      console.log(`  cps : ${hex(r.text)}`);
    } catch (e) {
      console.log(`\n[${name}] ERROR ${e.message}`);
    }
  }
})();
