var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseRtf = parseRtf;
exports.parseRtfFromBytes = parseRtfFromBytes;
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var FileSystem = require('expo-file-system/legacy');
function readBytes(_x) {
  return _readBytes.apply(this, arguments);
}
function _readBytes() {
  _readBytes = (0, _asyncToGenerator2.default)(function* (uri) {
    if (/^https?:\/\//i.test(uri)) {
      var buf = yield (yield fetch(uri)).arrayBuffer();
      return new Uint8Array(buf);
    }
    var cacheUri = `${FileSystem.cacheDirectory}br_rtf_${Date.now()}.rtf`;
    yield FileSystem.copyAsync({
      from: uri,
      to: cacheUri
    });
    var base64 = yield FileSystem.readAsStringAsync(cacheUri, {
      encoding: 'base64'
    });
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
    return bytes;
  });
  return _readBytes.apply(this, arguments);
}
function bytesToString(bytes) {
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}
var SKIP_GROUPS = /fonttbl|colortbl|info|stylesheet|generator|themedata|colorschememapping|datastore|listtable|listoverridetable|revtbl|rsidtbl|latentstyles|pgptbl|header|footer|headerl|headerr|footerl|footerr|formfield|pict|object|fldrslt|xmlnstbl|userprops/;
var WIN1252_MAP = {
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
function win1252ToUnicode(code) {
  var _WIN1252_MAP$code;
  return (_WIN1252_MAP$code = WIN1252_MAP[code]) != null ? _WIN1252_MAP$code : code;
}
var WIN1251_MAP = function () {
  var m = {};
  var special = {
    0x80: 0x0402,
    0x81: 0x0403,
    0x82: 0x201A,
    0x83: 0x0453,
    0x84: 0x201E,
    0x85: 0x2026,
    0x86: 0x2020,
    0x87: 0x2021,
    0x88: 0x20AC,
    0x89: 0x2030,
    0x8A: 0x0409,
    0x8B: 0x2039,
    0x8C: 0x040A,
    0x8D: 0x040C,
    0x8E: 0x040B,
    0x8F: 0x040F,
    0x90: 0x0452,
    0x91: 0x2018,
    0x92: 0x2019,
    0x93: 0x201C,
    0x94: 0x201D,
    0x95: 0x2022,
    0x96: 0x2013,
    0x97: 0x2014,
    0x99: 0x2122,
    0x9A: 0x0459,
    0x9B: 0x203A,
    0x9C: 0x045A,
    0x9D: 0x045C,
    0x9E: 0x045B,
    0x9F: 0x045F,
    0xA0: 0x00A0,
    0xA1: 0x040E,
    0xA2: 0x045E,
    0xA3: 0x0408,
    0xA4: 0x00A4,
    0xA5: 0x0490,
    0xA6: 0x00A6,
    0xA7: 0x00A7,
    0xA8: 0x0401,
    0xA9: 0x00A9,
    0xAA: 0x0404,
    0xAB: 0x00AB,
    0xAC: 0x00AC,
    0xAD: 0x00AD,
    0xAE: 0x00AE,
    0xAF: 0x0407,
    0xB0: 0x00B0,
    0xB1: 0x00B1,
    0xB2: 0x0406,
    0xB3: 0x0456,
    0xB4: 0x0491,
    0xB5: 0x00B5,
    0xB6: 0x00B6,
    0xB7: 0x00B7,
    0xB8: 0x0451,
    0xB9: 0x2116,
    0xBA: 0x0454,
    0xBB: 0x00BB,
    0xBC: 0x0458,
    0xBD: 0x0405,
    0xBE: 0x0455,
    0xBF: 0x0457
  };
  Object.assign(m, special);
  for (var b = 0xc0; b <= 0xff; b++) m[b] = 0x0410 + (b - 0xc0);
  return m;
}();
function cpToUnicode(code, enc) {
  var _WIN1251_MAP$code, _WIN1252_MAP$code2;
  if (enc === 1251) return (_WIN1251_MAP$code = WIN1251_MAP[code]) != null ? _WIN1251_MAP$code : code;
  if (enc === 'utf8') return code;
  return (_WIN1252_MAP$code2 = WIN1252_MAP[code]) != null ? _WIN1252_MAP$code2 : code;
}
function hasUtf8Sequences(raw) {
  var multi = 0;
  var n = raw.length;
  for (var i = 0; i < n; i++) {
    var b = raw[i];
    if (b >= 0xc2 && b <= 0xdf) {
      if (i + 1 < n && (raw[i + 1] & 0xc0) === 0x80) {
        multi++;
        i += 1;
      }
    } else if (b >= 0xe0 && b <= 0xef) {
      if (i + 2 < n && (raw[i + 1] & 0xc0) === 0x80 && (raw[i + 2] & 0xc0) === 0x80) {
        multi++;
        i += 2;
      }
    } else if (b >= 0xf0 && b <= 0xf4) {
      if (i + 3 < n && (raw[i + 1] & 0xc0) === 0x80 && (raw[i + 2] & 0xc0) === 0x80 && (raw[i + 3] & 0xc0) === 0x80) {
        multi++;
        i += 3;
      }
    }
  }
  return multi >= 2;
}
function detectEncoding(raw) {
  if (raw.length >= 3 && raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) return 'utf8';
  var head = bytesToString(raw.subarray(0, Math.min(256, raw.length)));
  var m = head.match(/\\ansicpg(\d+)/i);
  var cp = m ? parseInt(m[1], 10) : 1252;
  if (cp === 65001) return 'utf8';
  if (cp === 1251) return 1251;
  if (hasUtf8Sequences(raw)) return 'utf8';
  return 1252;
}
function tryUtf8(raw, i, n) {
  var b0 = raw[i];
  var len = 0;
  var cp = 0;
  if (b0 >= 0xc2 && b0 <= 0xdf) {
    len = 2;
    cp = b0 & 0x1f;
  } else if (b0 >= 0xe0 && b0 <= 0xef) {
    len = 3;
    cp = b0 & 0x0f;
  } else if (b0 >= 0xf0 && b0 <= 0xf4) {
    len = 4;
    cp = b0 & 0x07;
  } else return null;
  if (i + len > n) return null;
  for (var k = 1; k < len; k++) {
    var b = raw[i + k];
    if ((b & 0xc0) !== 0x80) return null;
    cp = cp << 6 | b & 0x3f;
  }
  if (len === 3 && cp < 0x800) return null;
  if (len === 4 && cp < 0x10000) return null;
  if (cp > 0x10ffff) return null;
  return {
    cp: cp,
    len: len
  };
}
var isHexByte = function isHexByte(b) {
  return b >= 0x30 && b <= 0x39 || b >= 0x41 && b <= 0x46 || b >= 0x61 && b <= 0x66;
};
function parseRtf(_x2, _x3) {
  return _parseRtf.apply(this, arguments);
}
function _parseRtf() {
  _parseRtf = (0, _asyncToGenerator2.default)(function* (uri, onProgress) {
    var bytes = yield readBytes(uri);
    return parseRtfFromBytes(bytes, onProgress);
  });
  return _parseRtf.apply(this, arguments);
}
function parseRtfFromBytes(_x4, _x5) {
  return _parseRtfFromBytes.apply(this, arguments);
}
function _parseRtfFromBytes() {
  _parseRtfFromBytes = (0, _asyncToGenerator2.default)(function* (bytes, onProgress) {
    var raw = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    return parseRtfFromBytesRaw(raw, onProgress);
  });
  return _parseRtfFromBytes.apply(this, arguments);
}
function parseRtfFromBytesRaw(_x6, _x7) {
  return _parseRtfFromBytesRaw.apply(this, arguments);
}
function _parseRtfFromBytesRaw() {
  _parseRtfFromBytesRaw = (0, _asyncToGenerator2.default)(function* (raw, onProgress) {
    var tick = function tick(p) {
      return onProgress == null ? void 0 : onProgress(p);
    };
    tick(0.1);
    var enc = detectEncoding(raw);
    tick(0.4);
    var out = '';
    var i = 0;
    var n = raw.length;
    while (i < n) {
      var ch = raw[i];
      if (ch === 0x7b) {
        i++;
        var word = '';
        if (raw[i] === 0x5c) i++;
        while (i < n && raw[i] >= 0x41 && raw[i] <= 0x7a) {
          word += String.fromCharCode(raw[i]);
          i++;
        }
        while (i < n && raw[i] >= 0x30 && raw[i] <= 0x39 || raw[i] === 0x2d) i++;
        if (raw[i] === 0x20) i++;
        if (word.startsWith('*') || SKIP_GROUPS.test(word)) {
          var depth = 1;
          while (i < n && depth > 0) {
            if (raw[i] === 0x7b) depth++;else if (raw[i] === 0x7d) depth--;
            i++;
          }
          out += ' ';
          continue;
        }
        continue;
      } else if (ch === 0x7d) {
        i++;
        continue;
      } else if (ch === 0x5c) {
        i++;
        if (raw[i] === 0x27) {
          var h1 = raw[i + 1];
          var h2 = raw[i + 2];
          if (h1 !== undefined && h2 !== undefined && isHexByte(h1) && isHexByte(h2)) {
            var code = parseInt(String.fromCharCode(h1, h2), 16);
            out += String.fromCharCode(cpToUnicode(code, enc));
            i += 3;
            continue;
          }
          out += "'";
          i++;
          continue;
        }
        if (raw[i] === 0x75) {
          i++;
          var num = '';
          while (i < n && (raw[i] >= 0x30 && raw[i] <= 0x39 || raw[i] === 0x2d)) {
            num += String.fromCharCode(raw[i]);
            i++;
          }
          var _code = parseInt(num, 10);
          if (!isNaN(_code)) {
            var u = _code < 0 ? _code + 65536 : _code;
            if (u > 0) out += String.fromCharCode(u);
          }
          if (i < n) {
            var c = raw[i];
            var isBoundary = c === 0x20 || c === 0x5c || c === 0x7b || c === 0x7d;
            if (!isBoundary) i++;
          }
          if (raw[i] === 0x20) i++;
          continue;
        }
        var _word = '';
        while (i < n && raw[i] >= 0x41 && raw[i] <= 0x7a) {
          _word += String.fromCharCode(raw[i]);
          i++;
        }
        if (raw[i] === 0x20) i++;
        if (_word === 'par' || _word === 'line') out += '\n';else if (_word === 'tab') out += '\t';
        continue;
      } else if (ch >= 0x20 && ch < 0x7f) {
        out += String.fromCharCode(ch);
        i++;
      } else if (ch >= 0x80) {
        if (enc === 'utf8') {
          var _u = tryUtf8(raw, i, n);
          if (_u && _u.cp >= 0x20 && _u.cp !== 0x7f) {
            out += String.fromCodePoint(_u.cp);
            i += _u.len;
            continue;
          }
        }
        var cp = cpToUnicode(ch, enc);
        if (cp >= 0x20 && cp !== 0x7f) out += String.fromCharCode(cp);
        i++;
      } else {
        i++;
      }
    }
    var text = out.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    tick(0.9);
    var titleM = bytesToString(raw).match(/\\title\s+([^{}\\]+)/i);
    tick(1);
    return {
      text: text,
      title: titleM ? titleM[1].trim() : undefined
    };
  });
  return _parseRtfFromBytesRaw.apply(this, arguments);
}