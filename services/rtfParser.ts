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
        if (h1 && h2 && 
            ((h1 >= 0x30 && h1 <= 0x39) || (h1 >= 0x41 && h1 <= 0x46) || (h1 >= 0x61 && h1 <= 0x66)) &&
            ((h2 >= 0x30 && h2 <= 0x39) || (h2 >= 0x41 && h2 <= 0x46) || (h2 >= 0x61 && h2 <= 0x66))) {
          const code = parseInt(String.fromCharCode(h1) + String.fromCharCode(h2), 16);
          out += String.fromCharCode(win1252ToUnicode(code));
          i += 3;
          continue;
        }
        // Not valid hex — output the apostrophe literally
        out += "'";
        i++;
        continue;
      }
      // \uN — unicode
      if (raw[i] === 0x75) { // 'u'
        i++;
        let num = '';
        while (i < n && ((raw[i] >= 0x30 && raw[i] <= 0x39) || raw[i] === 0x2d)) { num += String.fromCharCode(raw[i]); i++; }
        const code = parseInt(num, 10);
        if (!isNaN(code) && code > 0) {
          out += String.fromCharCode(code);
        }
        // Skip fallback character
        if (i < n && raw[i] < 0x41 || raw[i] > 0x7a) i++;
        if (raw[i] === 0x20) i++;
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
      // High byte — decode Windows-1252
      out += String.fromCharCode(win1252ToUnicode(ch));
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
