// services/rtfParser.ts
// RTF — текстовий формат з управляючими командами {\rtf...}.
// СТЕКОВИЙ парсер: відстежує групи {...}, повністю ВИДАЛЯЄ службові групи
// (fonttbl, colortbl, info, stylesheet, generator, \*\*), лишає лише текст тіла.
// Обробляє: \par → \n, \'hh (hex) і \uN? (unicode) → символи.
import { tStatic } from '../i18n';

export interface RtfParseResult {
  text: string;
  title?: string;
  author?: string;
}

// @ts-ignore
const FileSystem: any = require('expo-file-system/legacy');

async function readBytes(uri: string): Promise<Uint8Array> {
  if (/^https?:\/\//i.test(uri)) {
    const buf = await (await fetch(uri)).arrayBuffer();
    return new Uint8Array(buf);
  }
  const cacheUri = `${FileSystem.cacheDirectory}br_rtf_${Date.now()}.rtf`;
  await FileSystem.copyAsync({ from: uri, to: cacheUri });
  const base64 = await FileSystem.readAsStringAsync(cacheUri, { encoding: 'base64' as any });
  // base64 → Uint8Array
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
  return bytes;
}

function bytesToString(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

// Службові групи, які треба цілком викинути (не лише їхні control words).
const SKIP_GROUPS = /fonttbl|colortbl|info|stylesheet|generator|themedata|colorschememapping|datastore|listtable|listoverridetable|revtbl|rsidtbl|latentstyles|pgptbl|header|footer|headerl|headerr|footerl|footerr|formfield|pict|object|fldrslt|xmlnstbl|userprops/;

// Windows-1252 → Unicode mapping for code points 0x80-0x9F
// (RTF uses Windows-1252 for \\'hh escapes, but JS uses Unicode)
const WIN1252_MAP: Record<number, number> = {
  0x80: 0x20AC, // €
  0x82: 0x201A, // ‚
  0x83: 0x0192, // ƒ
  0x84: 0x201E, // „
  0x85: 0x2026, // …
  0x86: 0x2020, // †
  0x87: 0x2021, // ‡
  0x88: 0x02C6, // ˆ
  0x89: 0x2030, // ‰
  0x8A: 0x0160, // Š
  0x8B: 0x2039, // ‹
  0x8C: 0x0152, // Œ
  0x8E: 0x017D, // Ž
  0x91: 0x2018, // ‘
  0x92: 0x2019, // ’
  0x93: 0x201C, // “
  0x94: 0x201D, // ”
  0x95: 0x2022, // •
  0x96: 0x2013, // –
  0x97: 0x2014, // —
  0x98: 0x02DC, // ˜
  0x99: 0x2122, // ™
  0x9A: 0x0161, // š
  0x9B: 0x203A, // ›
  0x9C: 0x0153, // œ
  0x9E: 0x017E, // ž
  0x9F: 0x0178, // Ÿ
};

function win1252ToUnicode(code: number): number {
  return WIN1252_MAP[code] ?? code;
}

// ---- Windows-1251 (кирилиця) → Unicode ----
const WIN1251_MAP: Record<number, number> = (() => {
  const m: Record<number, number> = {};
  const special: Record<number, number> = {
    0x80: 0x0402, 0x81: 0x0403, 0x82: 0x201A, 0x83: 0x0453, 0x84: 0x201E,
    0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x20AC, 0x89: 0x2030,
    0x8A: 0x0409, 0x8B: 0x2039, 0x8C: 0x040A, 0x8D: 0x040C, 0x8E: 0x040B,
    0x8F: 0x040F, 0x90: 0x0452, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C,
    0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x99: 0x2122,
    0x9A: 0x0459, 0x9B: 0x203A, 0x9C: 0x045A, 0x9D: 0x045C, 0x9E: 0x045B,
    0x9F: 0x045F, 0xA0: 0x00A0, 0xA1: 0x040E, 0xA2: 0x045E, 0xA3: 0x0408,
    0xA4: 0x00A4, 0xA5: 0x0490, 0xA6: 0x00A6, 0xA7: 0x00A7, 0xA8: 0x0401,
    0xA9: 0x00A9, 0xAA: 0x0404, 0xAB: 0x00AB, 0xAC: 0x00AC, 0xAD: 0x00AD,
    0xAE: 0x00AE, 0xAF: 0x0407, 0xB0: 0x00B0, 0xB1: 0x00B1, 0xB2: 0x0406,
    0xB3: 0x0456, 0xB4: 0x0491, 0xB5: 0x00B5, 0xB6: 0x00B6, 0xB7: 0x00B7,
    0xB8: 0x0451, 0xB9: 0x2116, 0xBA: 0x0454, 0xBB: 0x00BB, 0xBC: 0x0458,
    0xBD: 0x0405, 0xBE: 0x0455, 0xBF: 0x0457,
  };
  Object.assign(m, special);
  for (let b = 0xc0; b <= 0xff; b++) m[b] = 0x0410 + (b - 0xc0); // А-я
  return m;
})();

type RtfEncoding = 'utf8' | 1251 | 1252;

function cpToUnicode(code: number, enc: RtfEncoding): number {
  if (enc === 1251) return WIN1251_MAP[code] ?? code;
  if (enc === 'utf8') return code;
  return WIN1252_MAP[code] ?? code;
}

/** Чи є в байтах валідні багатобайтові UTF-8 послідовності (ознака UTF-8 файлу). */
function hasUtf8Sequences(raw: Uint8Array): boolean {
  let multi = 0;
  const n = raw.length;
  for (let i = 0; i < n; i++) {
    const b = raw[i];
    if (b >= 0xc2 && b <= 0xdf) {
      if (i + 1 < n && (raw[i + 1] & 0xc0) === 0x80) { multi++; i += 1; }
    } else if (b >= 0xe0 && b <= 0xef) {
      if (i + 2 < n && (raw[i + 1] & 0xc0) === 0x80 && (raw[i + 2] & 0xc0) === 0x80) { multi++; i += 2; }
    } else if (b >= 0xf0 && b <= 0xf4) {
      if (i + 3 < n && (raw[i + 1] & 0xc0) === 0x80 && (raw[i + 2] & 0xc0) === 0x80 && (raw[i + 3] & 0xc0) === 0x80) { multi++; i += 3; }
    }
  }
  return multi >= 2;
}

/**
 * Визначення кодування RTF: BOM → UTF-8; \ansicpg65001 → UTF-8; \ansicpg1251 →
 * кирилиця; \ansicpg1252/інше → cp1252, але якщо у тілі є валідні багатобайтові
 * UTF-8 послідовності — це UTF-8 (writer збрехав у заголовку).
 */
function detectEncoding(raw: Uint8Array): RtfEncoding {
  if (raw.length >= 3 && raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) return 'utf8';
  const head = bytesToString(raw.subarray(0, Math.min(256, raw.length)));
  const m = head.match(/\\ansicpg(\d+)/i);
  const cp = m ? parseInt(m[1], 10) : 1252;
  if (cp === 65001) return 'utf8';
  if (cp === 1251) return 1251;
  if (hasUtf8Sequences(raw)) return 'utf8';
  return 1252;
}

/** Декодує багатобайтову UTF-8 послідовність, що починається з raw[i]. */
function tryUtf8(raw: Uint8Array, i: number, n: number): { cp: number; len: number } | null {
  const b0 = raw[i];
  let len = 0;
  let cp = 0;
  if (b0 >= 0xc2 && b0 <= 0xdf) { len = 2; cp = b0 & 0x1f; }
  else if (b0 >= 0xe0 && b0 <= 0xef) { len = 3; cp = b0 & 0x0f; }
  else if (b0 >= 0xf0 && b0 <= 0xf4) { len = 4; cp = b0 & 0x07; }
  else return null;
  if (i + len > n) return null;
  for (let k = 1; k < len; k++) {
    const b = raw[i + k];
    if ((b & 0xc0) !== 0x80) return null;
    cp = (cp << 6) | (b & 0x3f);
  }
  if (len === 3 && cp < 0x800) return null;   // overlong
  if (len === 4 && cp < 0x10000) return null; // overlong
  if (cp > 0x10ffff) return null;
  return { cp, len };
}

const isHexByte = (b: number) =>
  (b >= 0x30 && b <= 0x39) || (b >= 0x41 && b <= 0x46) || (b >= 0x61 && b <= 0x66);

export async function parseRtf(
  uri: string,
  onProgress?: (p: number) => void,
): Promise<RtfParseResult> {
  const bytes = await readBytes(uri);
  return parseRtfFromBytes(bytes, onProgress);
}

/**
 * Парсер RTF з готових байтів — для Web Worker.
 */
export async function parseRtfFromBytes(
  bytes: ArrayBuffer | Uint8Array,
  onProgress?: (p: number) => void,
): Promise<RtfParseResult> {
  const raw = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return parseRtfFromBytesRaw(raw, onProgress);
}

async function parseRtfFromBytesRaw(
  raw: Uint8Array,
  onProgress?: (p: number) => void,
): Promise<RtfParseResult> {
  const tick = (p: number) => onProgress?.(p);
  tick(0.1);

  const enc = detectEncoding(raw);
  tick(0.4);

  // Parse RTF at BYTE level — raw bytes, not UTF-8 string
  // This preserves bytes 0x80-0x9F (Windows-1252) for hex escape decoding
  let out = '';
  let i = 0;
  const n = raw.length;

  while (i < n) {
    const ch = raw[i];
    if (ch === 0x7b) { // '{'
      i++;
      // Skip leading backslash if present
      let word = '';
      if (raw[i] === 0x5c) i++; // skip backslash
      while (i < n && raw[i] >= 0x41 && raw[i] <= 0x7a) { word += String.fromCharCode(raw[i]); i++; }
      while (i < n && (raw[i] >= 0x30 && raw[i] <= 0x39) || raw[i] === 0x2d) i++;
      if (raw[i] === 0x20) i++;
      // Check for skip groups
      if (word.startsWith('*') || SKIP_GROUPS.test(word)) {
        let depth = 1;
        while (i < n && depth > 0) {
          if (raw[i] === 0x7b) depth++;
          else if (raw[i] === 0x7d) depth--;
          i++;
        }
        out += ' ';
        continue;
      }
      continue;
    } else if (ch === 0x7d) { // '}'
      i++;
      continue;
    } else if (ch === 0x5c) { // backslash
      i++;
      // backslash-escape sequence
      // Check for hex literal: \'hh
      if (raw[i] === 0x27) { // apostrophe
        const h1 = raw[i + 1];
        const h2 = raw[i + 2];
        // STRICT validation: both must be valid hex chars (0-9, a-f, A-F)
        if (h1 !== undefined && h2 !== undefined && isHexByte(h1) && isHexByte(h2)) {
          const code = parseInt(String.fromCharCode(h1, h2), 16);
          out += String.fromCharCode(cpToUnicode(code, enc));
          i += 3;
          continue;
        }
        // Not valid hex — output the apostrophe literally
        out += "'";
        i++;
        continue;
      }
      // \uN — unicode; за RTF-спекою далі йде ОДИН ANSI-fallback, який читатель ігнорує
      if (raw[i] === 0x75) { // 'u'
        i++;
        let num = '';
        while (i < n && ((raw[i] >= 0x30 && raw[i] <= 0x39) || raw[i] === 0x2d)) { num += String.fromCharCode(raw[i]); i++; }
        const code = parseInt(num, 10);
        if (!isNaN(code)) {
          const u = code < 0 ? code + 65536 : code; // RTF: від'ємне = 16-біт unsigned
          if (u > 0) out += String.fromCharCode(u);
        }
        // fallback: пропускаємо РІВНО ОДИН символ, якщо це не роздільник/початок команди
        if (i < n) {
          const c = raw[i];
          const isBoundary =
            c === 0x20 /* space */ || c === 0x5c /* \ */ || c === 0x7b /* { */ || c === 0x7d /* } */;
          if (!isBoundary) i++;
        }
        if (raw[i] === 0x20) i++; // пробіл-роздільник контрольного слова
        continue;
      }
      // Skip other control words
      let word = '';
      while (i < n && raw[i] >= 0x41 && raw[i] <= 0x7a) { word += String.fromCharCode(raw[i]); i++; }
      if (raw[i] === 0x20) i++;
      if (word === 'par' || word === 'line') out += '\n';
      else if (word === 'tab') out += '\t';
      continue;
    } else if (ch >= 0x20 && ch < 0x7f) {
      // ASCII printable
      out += String.fromCharCode(ch);
      i++;
    } else if (ch >= 0x80) {
      // Високий байт: UTF-8 послідовність або однобайтовий код документа
      if (enc === 'utf8') {
        const u = tryUtf8(raw, i, n);
        if (u && u.cp >= 0x20 && u.cp !== 0x7f) {
          out += String.fromCodePoint(u.cp);
          i += u.len;
          continue;
        }
      }
      const cp = cpToUnicode(ch, enc);
      if (cp >= 0x20 && cp !== 0x7f) out += String.fromCharCode(cp);
      i++;
    } else {
      // Control chars (newline etc)
      i++;
    }
  }

  // cleanup: множинні пробіли/порожні рядки
  let text = out
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  tick(0.9);

  // title з {\\info {\\title ...}} — шукаємо у сирому тексті
  const titleM = bytesToString(raw).match(/\\title\s+([^{}\\]+)/i);
  tick(1);
  return { text, title: titleM ? titleM[1].trim() : undefined };
}
