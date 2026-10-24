var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseZip = parseZip;
exports.parseZipFromBytes = parseZipFromBytes;
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _jszip = _interopRequireDefault(require("jszip"));
var _htmlParser = require("./htmlParser");
var _fb2Parser = require("./fb2Parser");
var _epubParser = require("./epubParser");
var _mobiParser = require("./mobiParser");
var _docxParser = require("./docxParser");
var _odtParser = require("./odtParser");
var _rtfParser = require("./rtfParser");
function extOf(name) {
  return (name.split('.').pop() || '').toLowerCase();
}
var BOOK_EXTS = new Set(['txt', 'fb2', 'html', 'htm', 'xhtml', 'epub', 'mobi', 'azw', 'azw3', 'prc', 'docx', 'odt', 'rtf']);
function parseZip(_x) {
  return _parseZip.apply(this, arguments);
}
function _parseZip() {
  _parseZip = (0, _asyncToGenerator2.default)(function* (uri) {
    var FileSystem = require('expo-file-system/legacy');
    var base64;
    if (/^https?:\/\//i.test(uri)) {
      var buf = yield (yield fetch(uri)).arrayBuffer();
      base64 = btoa(String.fromCharCode.apply(String, (0, _toConsumableArray2.default)(new Uint8Array(buf))));
    } else {
      var cacheUri = `${FileSystem.cacheDirectory}br_zip_${Date.now()}.zip`;
      yield FileSystem.copyAsync({
        from: uri,
        to: cacheUri
      });
      base64 = yield FileSystem.readAsStringAsync(cacheUri, {
        encoding: 'base64'
      });
    }
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return parseZipFromBytes(bytes.buffer);
  });
  return _parseZip.apply(this, arguments);
}
function parseZipFromBytes(_x2, _x3) {
  return _parseZipFromBytes.apply(this, arguments);
}
function _parseZipFromBytes() {
  _parseZipFromBytes = (0, _asyncToGenerator2.default)(function* (arrayBuffer, _onProgress) {
    var zip = yield _jszip.default.loadAsync(arrayBuffer);
    var files = Object.values(zip.files).filter(function (f) {
      return !f.dir;
    });
    if (files.length === 0) throw new Error('ZIP is empty');
    var candidates = files.map(function (f) {
      return f.name;
    }).filter(function (n) {
      var e = extOf(n);
      if (!BOOK_EXTS.has(e)) return false;
      var base = n.split('/').pop() || '';
      if (/mimetype|container\.xml|\.opf$|\.ncx$|\.css$|\.js$|\.json$/.test(base)) return false;
      return true;
    }).sort(function (a, b) {
      var depthA = a.split('/').length;
      var depthB = b.split('/').length;
      if (depthA !== depthB) return depthA - depthB;
      return a.localeCompare(b);
    });
    if (candidates.length === 0) {
      throw new Error('No readable book found inside ZIP (supported: txt, fb2, epub, html, mobi, docx, odt, rtf)');
    }
    var name = candidates[0];
    var ext = extOf(name);
    var file = zip.file(name);
    if (!file) throw new Error('ZIP entry missing: ' + name);
    var innerBytes = yield file.async('uint8array');
    var innerBuffer = new Uint8Array(innerBytes).slice().buffer;
    switch (ext) {
      case 'txt':
        {
          var text = new TextDecoder('utf-8').decode(innerBytes);
          return {
            text: text,
            title: (name.split('/').pop() || '').replace(/\.[^.]+$/, ''),
            innerFormat: ext
          };
        }
      case 'htm':
      case 'html':
      case 'xhtml':
        {
          var _r$title;
          var r = yield (0, _htmlParser.parseHtmlFromBytes)(innerBuffer);
          return {
            text: r.text,
            title: (_r$title = r.title) != null ? _r$title : (name.split('/').pop() || '').replace(/\.[^.]+$/, ''),
            innerFormat: ext
          };
        }
      case 'fb2':
        {
          var _r = yield (0, _fb2Parser.parseFb2FromBytes)(innerBuffer);
          return {
            text: _r.text,
            title: _r.title,
            innerFormat: ext
          };
        }
      case 'mobi':
      case 'azw':
      case 'azw3':
      case 'prc':
        {
          var _r2 = yield (0, _mobiParser.parseMobiFromBytes)(innerBuffer);
          return {
            text: _r2.text,
            title: _r2.title,
            innerFormat: ext
          };
        }
      case 'docx':
        {
          var _r3 = yield (0, _docxParser.parseDocxFromBytes)(innerBuffer);
          return {
            text: _r3.text,
            title: _r3.title,
            innerFormat: ext
          };
        }
      case 'odt':
        {
          var _r4 = yield (0, _odtParser.parseOdtFromBytes)(innerBuffer);
          return {
            text: _r4.text,
            title: _r4.title,
            innerFormat: ext
          };
        }
      case 'rtf':
        {
          var _r5 = yield (0, _rtfParser.parseRtfFromBytes)(innerBuffer);
          return {
            text: _r5.text,
            title: _r5.title,
            innerFormat: ext
          };
        }
      case 'epub':
        {
          var _r6 = yield (0, _epubParser.parseEpubFromBytes)(innerBuffer);
          return {
            text: _r6.text,
            title: _r6.title,
            author: _r6.author,
            cover: _r6.cover,
            innerFormat: ext
          };
        }
      default:
        throw new Error('Unsupported inner format: ' + ext);
    }
  });
  return _parseZipFromBytes.apply(this, arguments);
}