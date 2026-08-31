// utils/htmlEntities.ts
// ЄДИНИЙ повний HTML-entity декодер для ВСІХ парсерів (epub/fb2/docx/odt/html/mobi/zip).
// Раніше кожен парсер мав власний обмежений decodeEntities (лише &amp; &lt; &gt; &quot; &apos; &nbsp;),
// тому числові entities (&#8220; &#8217; &#233; &#x201C; тощо) показувались як «незрозумілі символи».
// Тепер усі парсери використовують цей повний декодер.

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '\u2014', ndash: '\u2013', hellip: '\u2026',
  lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201C', rdquo: '\u201D',
  laquo: '\u00AB', raquo: '\u00BB', bull: '\u2022', middot: '\u00B7',
  copy: '\u00A9', reg: '\u00AE', trade: '\u2122', sect: '\u00A7', para: '\u00B6',
  deg: '\u00B0', plusmn: '\u00B1', times: '\u00D7', divide: '\u00F7',
  frac12: '\u00BD', frac14: '\u00BC', frac34: '\u00BE', sup1: '\u00B9',
  sup2: '\u00B2', sup3: '\u00B3',
  eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë',
  agrave: 'à', aacute: 'á', acirc: 'â', auml: 'ä', aring: 'å', aelig: 'æ',
  ccedil: 'ç', iacute: 'í', igrave: 'ì', icirc: 'î', iuml: 'ï',
  oacute: 'ó', ograve: 'ò', ocirc: 'ô', ouml: 'ö', oslash: 'ø', oelig: 'œ',
  uacute: 'ú', ugrave: 'ù', ucirc: 'û', uuml: 'ü', ntilde: 'ñ', szlig: 'ß',
  yacute: 'ý', yuml: 'ÿ',
  pound: '£', yen: '¥', euro: '€', cent: '¢', curren: '¤', brvbar: '¦',
  not: '¬', shy: '\u00AD', macr: '¯', uml: '¨', acute: '´', cedil: '¸',
  iquest: '¿', iexcl: '¡',
  // кириличні (на випадок) та розширені
  OElig: '\u0152', oelig2: '\u0153', Scaron: '\u0160', scaron: '\u0161',
  Yuml: '\u0178', fnof: '\u0192', circ: '\u02C6', tilde: '\u02DC',
  ensp: '\u2002', emsp: '\u2003', thinsp: '\u2009', zwnj: '\u200C', zwj: '\u200D',
  lrm: '\u200E', rlm: '\u200F', ndash2: '\u2013', mdash2: '\u2014',
  lsquo2: '\u2018', rsquo2: '\u2019', sbquo: '\u201A', ldquo2: '\u201C', rdquo2: '\u201D', bdquo: '\u201E',
  dagger: '\u2020', Dagger: '\u2021', permil: '\u2030', lsaquo: '\u2039', rsaquo: '\u203A',
};

/**
 * Повний HTML-entity декодер: named (&amp;), десяткові числові (&#8220;),
 * шістнадцяткові числові (&#x201C;). Невідомі entities лишає як є.
 */
export function decodeHtmlEntities(s: string): string {
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

/**
 * HTML → чистий текст: видаляє script/style, блочні теги → \n, решту тегів → пробіл,
 * потім декодує entities. Спільна для epub/mobi/zip/html.
 */
export function stripHtmlToText(html: string): string {
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
