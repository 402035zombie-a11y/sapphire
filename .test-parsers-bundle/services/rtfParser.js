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
          if (h1 && h2 && (h1 >= 0x30 && h1 <= 0x39 || h1 >= 0x41 && h1 <= 0x46 || h1 >= 0x61 && h1 <= 0x66) && (h2 >= 0x30 && h2 <= 0x39 || h2 >= 0x41 && h2 <= 0x46 || h2 >= 0x61 && h2 <= 0x66)) {
            var code = parseInt(String.fromCharCode(h1) + String.fromCharCode(h2), 16);
            out += String.fromCharCode(win1252ToUnicode(code));
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
          if (!isNaN(_code) && _code > 0) {
            out += String.fromCharCode(_code);
          }
          if (i < n && raw[i] < 0x41 || raw[i] > 0x7a) i++;
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
        out += String.fromCharCode(win1252ToUnicode(ch));
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