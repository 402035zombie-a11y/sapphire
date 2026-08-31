// services/mobiParser.ts
// MOBI (Kindle) = Palm Database (PDB) контейнер. Перший record = MOBI/PalmDOC header,
// решта records = текст у PalmDOC-компресії (LZ77-подібна) або без компресії.
// Парсер без залежностей: читає байти через expo-file-system, декодує, віддає чистий текст.

export interface MobiParseResult {
  text: string;
  title?: string;
  author?: string;
}

// base64 → Uint8Array (без залежності від atob, якого може не бути в Hermes)
function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, '');
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Int16Array(256).fill(-1);
  for (let i = 0; i < ALPHA.length; i++) lookup[ALPHA.charCodeAt(i)] = i;
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    const c = clean.charCodeAt(i);
    if (c === 61 /* = */) break; // padding
    const v = lookup[c];
    if (v < 0) continue;
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

// PalmDOC / MOBI LZ77-декомпресія (точний алгоритм Calibre mobi_uncompress.PalmdocReader).
function decompressPalmdoc(data: Uint8Array, maxLen: number): Uint8Array {
  const out: number[] = [];
  let i = 0;
  const n = data.length;
  while (i < n && out.length < maxLen) {
    let c = data[i++];
    if (c === 0) break; // end of text
    if (c >= 1 && c <= 8) {
      // literal run of c bytes
      for (let k = 0; k < c && i < n; k++) out.push(data[i++]);
    } else if (c < 0x80) {
      // literal SINGLE byte (9..127) — НЕ "run of c-8"!
      out.push(c);
    } else if (c >= 0xc0) {
      // space + (c ^ 0x80)
      out.push(0x20);
      out.push(c ^ 0x80);
    } else {
      // 0x80..0xBF: LZ77 — pair = (c<<8)|next
      if (i >= n) break;
      const c2 = data[i++];
      const pair = (c << 8) | c2;
      const dist = (pair >> 3) & 0x7ff; // distance (11 bits)
      const len = (pair & 0x07) + 3; // length
      // Критично для dist < len (self-overlap): копіюємо БАЙТ-ЗА-БАЙТОМ з
      // out.length - dist, щоб перекриття читало вже щойно додані байти.
      // (Спрощене out[dist+k] з fallback 0x20 давало «кашу» — сміття замість повторів.)
      for (let k = 0; k < len; k++) {
        const src = out.length - dist;
        out.push(src >= 0 && src < out.length ? out[src] : 0x20);
      }
    }
  }
  return new Uint8Array(out);
}

// CP1252 (Windows-1252) → string. PalmDOC текст у MOBI — single-byte CP1252
// (навіть коли text_encoding=65001/UTF-8, реальні байти лишаються CP1252 — відомий
// баг Amazon). Таблиця 0x80..0x9F → символи (€ ‚ ƒ „ … † ‡ ˆ ‰ Š ‹ Œ Ž ' ' " " • – — ˜ ™ š › œ ž Ÿ).
function cp1252Decode(bytes: Uint8Array): string {
  const SPECIAL: Record<number, number> = {
    0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
    0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
    0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019,
    0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
    0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153,
    0x9E: 0x017E, 0x9F: 0x0178,
  };
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 0x80) {
      out += String.fromCharCode(b);
    } else if (b in SPECIAL) {
      out += String.fromCharCode(SPECIAL[b]);
    } else {
      // 0xA0..0xFF → Latin-1 (CP1252 == Latin-1 у цьому діапазоні)
      out += String.fromCharCode(b);
    }
  }
  return out;
}

// UTF-8 → string (loose: невалідні байти → U+FFFD, не кидає помилку).
function utf8DecodeLoose(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i++];
    if (b0 < 0x80) {
      out += String.fromCharCode(b0);
    } else if ((b0 & 0xe0) === 0xc0) {
      const b1 = bytes[i++];
      if ((b1 & 0xc0) === 0x80) {
        out += String.fromCharCode(((b0 & 0x1f) << 6) | (b1 & 0x3f));
      } else {
        out += '\uFFFD';
        i--;
      }
    } else if ((b0 & 0xf0) === 0xe0) {
      const b1 = bytes[i++], b2 = bytes[i++];
      if ((b1 & 0xc0) === 0x80 && (b2 & 0xc0) === 0x80) {
        out += String.fromCharCode(((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f));
      } else {
        out += '\uFFFD';
        i -= 2;
      }
    } else if ((b0 & 0xf8) === 0xf0) {
      const b1 = bytes[i++], b2 = bytes[i++], b3 = bytes[i++];
      if ((b1 & 0xc0) === 0x80 && (b2 & 0xc0) === 0x80 && (b3 & 0xc0) === 0x80) {
        const cp = ((b0 & 0x07) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
        const code = cp - 0x10000;
        out += String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff));
      } else {
        out += '\uFFFD';
        i -= 3;
      }
    } else {
      out += '\uFFFD';
    }
  }
  return out;
}

function stripHtml(html: string): string {
  let t = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\s*(p|div|br|h[1-6]|li|\/p|\/div|\/h[1-6]|\/li)\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n');
  t = decodeHtmlEntities(t);
  return t.trim();
}

// Повний HTML-entity декодер (named + числові десяткові &#NNN; + шістнадцяткові &#xNN;).
// MOBI/Kindle файли рясно використовують числові entities (&#8220; лапки, &#8217; апостроф,
// &#233; é тощо) — без цього юзер бачить «незрозумілі символи» замість тексту.
function decodeHtmlEntities(s: string): string {
  const NAMED: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    mdash: '—', ndash: '–', hellip: '…', lsquo: '\u2018', rsquo: '\u2019',
    ldquo: '\u201C', rdquo: '\u201D', laquo: '«', raquo: '»', bull: '•',
    middot: '·', copy: '©', reg: '®', trade: '™', sect: '§', para: '¶',
    deg: '°', plusmn: '±', times: '×', divide: '÷', frac12: '½', frac14: '¼',
    frac34: '¾', sup1: '¹', sup2: '²', sup3: '³', eacute: 'é', egrave: 'è',
    ecirc: 'ê', euml: 'ë', agrave: 'à', aacute: 'á', acirc: 'â', auml: 'ä',
    aring: 'å', ccedil: 'ç', iacute: 'í', igrave: 'ì', icirc: 'î', iuml: 'ï',
    oacute: 'ó', ograve: 'ò', ocirc: 'ô', ouml: 'ö', oslash: 'ø', uacute: 'ú',
    ugrave: 'ù', ucirc: 'û', uuml: 'ü', ntilde: 'ñ', szlig: 'ß', yacute: 'ý',
    yuml: 'ÿ', aelig: 'æ', oelig: 'œ', pound: '£', yen: '¥', euro: '€',
    cent: '¢', curren: '¤', brvbar: '¦', not: '¬', shy: '\u00AD', macr: '¯',
    uml: '¨', acute: '´', cedil: '¸', iquest: '¿', iexcl: '¡',
  };
  // числові та named
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, ent: string) => {
    if (ent[0] === '#') {
      const hex = ent[1] === 'x' || ent[1] === 'X';
      const code = parseInt(hex ? ent.slice(2) : ent.slice(1), hex ? 16 : 10);
      if (!Number.isFinite(code) || code <= 0) return '';
      try {
        return String.fromCodePoint(code);
      } catch {
        return '';
      }
    }
    return NAMED[ent] ?? m;
  });
}

export async function parseMobi(uri: string): Promise<MobiParseResult> {
  // Патерн читання локального файлу як у epubParser: content:// читається через
  // expo-file-system/legacy (copy → readAsStringAsync base64).
  // @ts-ignore
  const FileSystem: any = require('expo-file-system/legacy');
  let bytes: Uint8Array;
  if (/^https?:\/\//i.test(uri)) {
    const buf = await (await fetch(uri)).arrayBuffer();
    bytes = new Uint8Array(buf);
  } else {
    const cacheUri = `${FileSystem.cacheDirectory}br_mobi_${Date.now()}.mobi`;
    await FileSystem.copyAsync({ from: uri, to: cacheUri });
    const b64 = await FileSystem.readAsStringAsync(cacheUri, { encoding: 'base64' as any });
    bytes = base64ToBytes(b64);
  }

  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 78) throw new Error('Invalid MOBI: file too short');

  // PDB header (big-endian)
  const numRecords = dv.getUint16(76);
  if (numRecords === 0 || numRecords > 65535) throw new Error('Invalid MOBI: bad record count');

  // Record info list: [offset(4) + attrs(1) + uniqueID(3)] × numRecords, починається з 78
  const offsets: number[] = [];
  for (let r = 0; r < numRecords; r++) {
    const pos = 78 + r * 8;
    if (pos + 4 > bytes.length) break;
    offsets.push(dv.getUint32(pos));
  }

  // Record 0 = PalmDOC/MOBI header
  const hdrStart = offsets[0] ?? 0;
  const compression = dv.getUint16(hdrStart);
  const textLength = dv.getUint32(hdrStart + 4);
  const recordCount = dv.getUint16(hdrStart + 8);
  const recordSize = dv.getUint16(hdrStart + 10);

  // recordCount з MOBI header може бути менший за реальну кількість текстових records
  // (images починаються після тексту). Знаходимо перший image-запис (JPEG/GIF/PNG magic)
  // і читаємо всі текстові records ДО нього.
  function isImageStart(b: Uint8Array): boolean {
    return (
      (b.length >= 2 && b[0] === 0xff && b[1] === 0xd8) || // JPEG
      (b.length >= 3 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) || // GIF
      (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) // PNG
    );
  }
  let firstImageIdx = recordCount + 1; // default: after recordCount
  for (let r = 1; r < numRecords; r++) {
    const s = offsets[r];
    const e = offsets[r + 1] ?? bytes.length;
    if (s == null || s >= e) continue;
    if (isImageStart(bytes.slice(s, Math.min(s + 4, e)))) {
      firstImageIdx = r;
      break;
    }
  }
  const textRecords = Math.min(firstImageIdx, numRecords);

  // Збираємо текст із records 1..textRecords-1
  const chunks: Uint8Array[] = [];
  for (let r = 1; r < textRecords; r++) {
    const start = offsets[r];
    const end = offsets[r + 1] ?? bytes.length;
    if (start == null || start >= end) continue;
    let rec: Uint8Array = bytes.slice(start, end);
    if (compression === 2) {
      // PalmDOC
      rec = decompressPalmdoc(rec, recordSize * 2);
    } else if (compression === 17480) {
      throw new Error('MOBI HUFF/CDIC compression is not supported');
    } else if (compression !== 1) {
      throw new Error('Unknown MOBI compression: ' + compression);
    }
    chunks.push(rec);
  }

  // Об'єднуємо і відрізаємо за textLength (якщо >0)
  let total = 0;
  for (const c of chunks) total += c.length;
  const merged = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { merged.set(c, off); off += c.length; }
  const finalLen = textLength > 0 ? Math.min(textLength, merged.length) : merged.length;
  const body = merged.slice(0, finalLen);

  // Визначаємо кодування з MOBI header (text_encoding на offset 12 у MOBI header).
  // 65001 = UTF-8, 1252 = CP1252. Але Amazon часто лишає CP1252 байти навіть у
  // «UTF-8» файлах → пробуємо UTF-8 strict, при помилці — CP1252.
  const mobiOff = hdrStart + 16;
  let encoding = 1252;
  if (mobiOff + 16 <= bytes.length) {
    encoding = dv.getUint32(mobiOff + 12);
  }
  let html: string;
  if (encoding === 65001) {
    // UTF-8 (replacement для невалідних байтів, НЕ fallback на CP1252).
    // Amazon може лишити кілька CP1252-байтів, але основний текст — UTF-8;
    // CP1252-fallback тут давав «â€œ» замість лапок «“».
    html = utf8DecodeLoose(body);
  } else {
    html = cp1252Decode(body);
  }
  const text = stripHtml(html);
  if (!text) throw new Error('Could not extract text from MOBI');

  // title: з HTML <title> або MOBI full-name (спрощено — <title> надійніше)
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : undefined;

  return { text, title };
}
