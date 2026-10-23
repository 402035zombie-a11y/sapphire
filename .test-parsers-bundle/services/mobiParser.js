var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseMobi = parseMobi;
exports.parseMobiFromBytes = parseMobiFromBytes;
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
function base64ToBytes(b64) {
  var clean = b64.replace(/\s+/g, '');
  var ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var lookup = new Int16Array(256).fill(-1);
  for (var i = 0; i < ALPHA.length; i++) lookup[ALPHA.charCodeAt(i)] = i;
  var out = [];
  var buffer = 0;
  var bits = 0;
  for (var _i = 0; _i < clean.length; _i++) {
    var c = clean.charCodeAt(_i);
    if (c === 61) break;
    var v = lookup[c];
    if (v < 0) continue;
    buffer = buffer << 6 | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push(buffer >> bits & 0xff);
    }
  }
  return new Uint8Array(out);
}
function decompressPalmdoc(data, maxLen) {
  var out = [];
  var i = 0;
  var n = data.length;
  while (i < n && out.length < maxLen) {
    var c = data[i++];
    if (c === 0) break;
    if (c >= 1 && c <= 8) {
      for (var k = 0; k < c && i < n; k++) out.push(data[i++]);
    } else if (c < 0x80) {
      out.push(c);
    } else if (c >= 0xc0) {
      out.push(0x20);
      out.push(c ^ 0x80);
    } else {
      if (i >= n) break;
      var c2 = data[i++];
      var pair = c << 8 | c2;
      var dist = pair >> 3 & 0x7ff;
      var len = (pair & 0x07) + 3;
      for (var _k = 0; _k < len; _k++) {
        var src = out.length - dist;
        out.push(src >= 0 && src < out.length ? out[src] : 0x20);
      }
    }
  }
  return new Uint8Array(out);
}
function cp1252Decode(bytes) {
  var SPECIAL = {
    0x80: 0x20AC,
    0x82: 0x201A,
    0x83: 0x0192,
    0x84: 0x201E,
    0x85: 0x2026,
    0x86: 0x2020,
    0x87: 0x2021,
    0x88: 0x02C6,
    0x89: 0x2030,
    0x8A: 0x0160,
    0x8B: 0x2039,
    0x8C: 0x0152,
    0x8E: 0x017D,
    0x91: 0x2018,
    0x92: 0x2019,
    0x93: 0x201C,
    0x94: 0x201D,
    0x95: 0x2022,
    0x96: 0x2013,
    0x97: 0x2014,
    0x98: 0x02DC,
    0x99: 0x2122,
    0x9A: 0x0161,
    0x9B: 0x203A,
    0x9C: 0x0153,
    0x9E: 0x017E,
    0x9F: 0x0178
  };
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i];
    if (b < 0x80) {
      out += String.fromCharCode(b);
    } else if (b in SPECIAL) {
      out += String.fromCharCode(SPECIAL[b]);
    } else {
      out += String.fromCharCode(b);
    }
  }
  return out;
}
function utf8DecodeLoose(bytes) {
  var out = '';
  var i = 0;
  while (i < bytes.length) {
    var b0 = bytes[i++];
    if (b0 < 0x80) {
      out += String.fromCharCode(b0);
    } else if ((b0 & 0xe0) === 0xc0) {
      var b1 = bytes[i++];
      if ((b1 & 0xc0) === 0x80) {
        out += String.fromCharCode((b0 & 0x1f) << 6 | b1 & 0x3f);
      } else {
        out += "\uFFFD";
        i--;
      }
    } else if ((b0 & 0xf0) === 0xe0) {
      var _b = bytes[i++],
        b2 = bytes[i++];
      if ((_b & 0xc0) === 0x80 && (b2 & 0xc0) === 0x80) {
        out += String.fromCharCode((b0 & 0x0f) << 12 | (_b & 0x3f) << 6 | b2 & 0x3f);
      } else {
        out += "\uFFFD";
        i -= 2;
      }
    } else if ((b0 & 0xf8) === 0xf0) {
      var _b2 = bytes[i++],
        _b3 = bytes[i++],
        b3 = bytes[i++];
      if ((_b2 & 0xc0) === 0x80 && (_b3 & 0xc0) === 0x80 && (b3 & 0xc0) === 0x80) {
        var cp = (b0 & 0x07) << 18 | (_b2 & 0x3f) << 12 | (_b3 & 0x3f) << 6 | b3 & 0x3f;
        var code = cp - 0x10000;
        out += String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff));
      } else {
        out += "\uFFFD";
        i -= 3;
      }
    } else {
      out += "\uFFFD";
    }
  }
  return out;
}
function stripHtml(html) {
  var t = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<\s*(p|div|br|h[1-6]|li|\/p|\/div|\/h[1-6]|\/li)\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n');
  t = decodeHtmlEntities(t);
  return t.trim();
}
function decodeHtmlEntities(s) {
  var NAMED = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    mdash: '—',
    ndash: '–',
    hellip: '…',
    lsquo: "\u2018",
    rsquo: "\u2019",
    ldquo: "\u201C",
    rdquo: "\u201D",
    laquo: '«',
    raquo: '»',
    bull: '•',
    middot: '·',
    copy: '©',
    reg: '®',
    trade: '™',
    sect: '§',
    para: '¶',
    deg: '°',
    plusmn: '±',
    times: '×',
    divide: '÷',
    frac12: '½',
    frac14: '¼',
    frac34: '¾',
    sup1: '¹',
    sup2: '²',
    sup3: '³',
    eacute: 'é',
    egrave: 'è',
    ecirc: 'ê',
    euml: 'ë',
    agrave: 'à',
    aacute: 'á',
    acirc: 'â',
    auml: 'ä',
    aring: 'å',
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
    uacute: 'ú',
    ugrave: 'ù',
    ucirc: 'û',
    uuml: 'ü',
    ntilde: 'ñ',
    szlig: 'ß',
    yacute: 'ý',
    yuml: 'ÿ',
    aelig: 'æ',
    oelig: 'œ',
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
    iexcl: '¡'
  };
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
function parseMobi(_x) {
  return _parseMobi.apply(this, arguments);
}
function _parseMobi() {
  _parseMobi = (0, _asyncToGenerator2.default)(function* (uri) {
    var FileSystem = require('expo-file-system/legacy');
    var bytes;
    if (/^https?:\/\//i.test(uri)) {
      var buf = yield (yield fetch(uri)).arrayBuffer();
      bytes = new Uint8Array(buf);
    } else {
      var cacheUri = `${FileSystem.cacheDirectory}br_mobi_${Date.now()}.mobi`;
      yield FileSystem.copyAsync({
        from: uri,
        to: cacheUri
      });
      var b64 = yield FileSystem.readAsStringAsync(cacheUri, {
        encoding: 'base64'
      });
      bytes = base64ToBytes(b64);
    }
    return parseMobiFromBytes(bytes.buffer);
  });
  return _parseMobi.apply(this, arguments);
}
function parseMobiFromBytes(_x2, _x3) {
  return _parseMobiFromBytes.apply(this, arguments);
}
function _parseMobiFromBytes() {
  _parseMobiFromBytes = (0, _asyncToGenerator2.default)(function* (arrayBuffer, _onProgress) {
    var _offsets$;
    var bytes = new Uint8Array(arrayBuffer);
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.length < 78) throw new Error('Invalid MOBI: file too short');
    var numRecords = dv.getUint16(76);
    if (numRecords === 0 || numRecords > 65535) throw new Error('Invalid MOBI: bad record count');
    var offsets = [];
    for (var r = 0; r < numRecords; r++) {
      var pos = 78 + r * 8;
      if (pos + 4 > bytes.length) break;
      offsets.push(dv.getUint32(pos));
    }
    var hdrStart = (_offsets$ = offsets[0]) != null ? _offsets$ : 0;
    var compression = dv.getUint16(hdrStart);
    var textLength = dv.getUint32(hdrStart + 4);
    var recordCount = dv.getUint16(hdrStart + 8);
    var recordSize = dv.getUint16(hdrStart + 10);
    function isImageStart(b) {
      return b.length >= 2 && b[0] === 0xff && b[1] === 0xd8 || b.length >= 3 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 || b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    }
    var firstImageIdx = recordCount + 1;
    for (var _r = 1; _r < numRecords; _r++) {
      var _offsets;
      var s = offsets[_r];
      var e = (_offsets = offsets[_r + 1]) != null ? _offsets : bytes.length;
      if (s == null || s >= e) continue;
      if (isImageStart(bytes.slice(s, Math.min(s + 4, e)))) {
        firstImageIdx = _r;
        break;
      }
    }
    var textRecords = Math.min(firstImageIdx, numRecords);
    var chunks = [];
    for (var _r2 = 1; _r2 < textRecords; _r2++) {
      var _offsets2;
      var start = offsets[_r2];
      var end = (_offsets2 = offsets[_r2 + 1]) != null ? _offsets2 : bytes.length;
      if (start == null || start >= end) continue;
      var rec = bytes.slice(start, end);
      if (compression === 2) {
        rec = decompressPalmdoc(rec, recordSize * 2);
      } else if (compression === 17480) {
        throw new Error('MOBI HUFF/CDIC compression is not supported');
      } else if (compression !== 1) {
        throw new Error('Unknown MOBI compression: ' + compression);
      }
      chunks.push(rec);
    }
    var total = 0;
    for (var c of chunks) total += c.length;
    var merged = new Uint8Array(total);
    var off = 0;
    for (var _c of chunks) {
      merged.set(_c, off);
      off += _c.length;
    }
    var finalLen = textLength > 0 ? Math.min(textLength, merged.length) : merged.length;
    var body = merged.slice(0, finalLen);
    var mobiOff = hdrStart + 16;
    var encoding = 1252;
    if (mobiOff + 16 <= bytes.length) {
      encoding = dv.getUint32(mobiOff + 12);
    }
    var html;
    if (encoding === 65001) {
      html = utf8DecodeLoose(body);
    } else {
      html = cp1252Decode(body);
    }
    var text = stripHtml(html);
    if (!text) throw new Error('Could not extract text from MOBI');
    var titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    var title = titleMatch ? titleMatch[1].trim() : undefined;
    return {
      text: text,
      title: title
    };
  });
  return _parseMobiFromBytes.apply(this, arguments);
}