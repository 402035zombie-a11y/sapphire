Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.decodeHtmlEntities = decodeHtmlEntities;
exports.stripHtmlToText = stripHtmlToText;
var NAMED = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: "\u2014",
  ndash: "\u2013",
  hellip: "\u2026",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201C",
  rdquo: "\u201D",
  laquo: "\xAB",
  raquo: "\xBB",
  bull: "\u2022",
  middot: "\xB7",
  copy: "\xA9",
  reg: "\xAE",
  trade: "\u2122",
  sect: "\xA7",
  para: "\xB6",
  deg: "\xB0",
  plusmn: "\xB1",
  times: "\xD7",
  divide: "\xF7",
  frac12: "\xBD",
  frac14: "\xBC",
  frac34: "\xBE",
  sup1: "\xB9",
  sup2: "\xB2",
  sup3: "\xB3",
  eacute: 'é',
  egrave: 'è',
  ecirc: 'ê',
  euml: 'ë',
  agrave: 'à',
  aacute: 'á',
  acirc: 'â',
  auml: 'ä',
  aring: 'å',
  aelig: 'æ',
  ccedil: 'ç',
  iacute: 'í',
  igrave: 'ì',
  icirc: 'î',
  iuml: 'ï',
  oacute: 'ó',
  ograve: 'ò',
  ocirc: 'ô',
  ouml: 'ö',
  oslash: 'ø',
  oelig: 'œ',
  uacute: 'ú',
  ugrave: 'ù',
  ucirc: 'û',
  uuml: 'ü',
  ntilde: 'ñ',
  szlig: 'ß',
  yacute: 'ý',
  yuml: 'ÿ',
  pound: '£',
  yen: '¥',
  euro: '€',
  cent: '¢',
  curren: '¤',
  brvbar: '¦',
  not: '¬',
  shy: "\xAD",
  macr: '¯',
  uml: '¨',
  acute: '´',
  cedil: '¸',
  iquest: '¿',
  iexcl: '¡',
  OElig: "\u0152",
  oelig2: "\u0153",
  Scaron: "\u0160",
  scaron: "\u0161",
  Yuml: "\u0178",
  fnof: "\u0192",
  circ: "\u02C6",
  tilde: "\u02DC",
  ensp: "\u2002",
  emsp: "\u2003",
  thinsp: "\u2009",
  zwnj: "\u200C",
  zwj: "\u200D",
  lrm: "\u200E",
  rlm: "\u200F",
  ndash2: "\u2013",
  mdash2: "\u2014",
  lsquo2: "\u2018",
  rsquo2: "\u2019",
  sbquo: "\u201A",
  ldquo2: "\u201C",
  rdquo2: "\u201D",
  bdquo: "\u201E",
  dagger: "\u2020",
  Dagger: "\u2021",
  permil: "\u2030",
  lsaquo: "\u2039",
  rsaquo: "\u203A"
};
function decodeHtmlEntities(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, function (m, ent) {
    var _NAMED$ent;
    if (ent[0] === '#') {
      var hex = ent[1] === 'x' || ent[1] === 'X';
      var code = parseInt(hex ? ent.slice(2) : ent.slice(1), hex ? 16 : 10);
      if (!Number.isFinite(code) || code <= 0) return '';
      try {
        return String.fromCodePoint(code);
      } catch (_unused) {
        return '';
      }
    }
    return (_NAMED$ent = NAMED[ent]) != null ? _NAMED$ent : m;
  });
}
function stripHtmlToText(html) {
  var t = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<\s*(p|div|br|h[1-6]|li|\/p|\/div|\/h[1-6]|\/li)\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n');
  t = decodeHtmlEntities(t);
  return t.trim();
}