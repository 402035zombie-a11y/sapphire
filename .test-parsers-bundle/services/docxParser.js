var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseDocx = parseDocx;
exports.parseDocxFromBytes = parseDocxFromBytes;
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _jszip = _interopRequireDefault(require("jszip"));
var _i18n = require("../i18n");
var _htmlEntities = require("../utils/htmlEntities");
function decodeEntities(s) {
  return (0, _htmlEntities.decodeHtmlEntities)(s);
}
function firstMatch(xml, re) {
  var m = xml.match(re);
  return m && m[1] ? decodeEntities(m[1].trim()) : undefined;
}
var FileSystem = require('expo-file-system/legacy');
function readBase64(_x) {
  return _readBase.apply(this, arguments);
}
function _readBase() {
  _readBase = (0, _asyncToGenerator2.default)(function* (uri) {
    if (/^https?:\/\//i.test(uri)) {
      var buf = yield (yield fetch(uri)).arrayBuffer();
      return btoa(String.fromCharCode.apply(String, (0, _toConsumableArray2.default)(new Uint8Array(buf))));
    }
    var cacheUri = `${FileSystem.cacheDirectory}br_docx_${Date.now()}.docx`;
    yield FileSystem.copyAsync({
      from: uri,
      to: cacheUri
    });
    return FileSystem.readAsStringAsync(cacheUri, {
      encoding: 'base64'
    });
  });
  return _readBase.apply(this, arguments);
}
function parseDocx(_x2, _x3) {
  return _parseDocx.apply(this, arguments);
}
function _parseDocx() {
  _parseDocx = (0, _asyncToGenerator2.default)(function* (uri, onProgress) {
    var tick = function tick(p) {
      return onProgress == null ? void 0 : onProgress(p);
    };
    tick(0.05);
    var base64 = yield readBase64(uri);
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return parseDocxFromBytes(bytes.buffer, onProgress);
  });
  return _parseDocx.apply(this, arguments);
}
function parseDocxFromBytes(_x4, _x5) {
  return _parseDocxFromBytes.apply(this, arguments);
}
function _parseDocxFromBytes() {
  _parseDocxFromBytes = (0, _asyncToGenerator2.default)(function* (arrayBuffer, onProgress) {
    var tick = function tick(p) {
      return onProgress == null ? void 0 : onProgress(p);
    };
    tick(0.05);
    var zip = yield _jszip.default.loadAsync(arrayBuffer);
    var docFile = zip.file('word/document.xml') || zip.file('word/document2.xml');
    if (!docFile) throw new Error((0, _i18n.tStatic)('Invalid DOCX: missing word/document.xml'));
    var xml = yield docFile.async('text');
    tick(0.25);
    var paraBlocks = xml.split(/<w:p[ >]/i).slice(1);
    var paragraphs = [];
    for (var block of paraBlocks) {
      var ts = block.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi) || [];
      var line = '';
      for (var t of ts) {
        var m = t.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/i);
        if (m) line += decodeEntities(m[1]);
      }
      if (line.trim()) paragraphs.push(line.trim());
    }
    tick(0.85);
    var core = zip.file('docProps/core.xml');
    var title, author;
    if (core) {
      var cx = yield core.async('text');
      title = firstMatch(cx, /<dc:title>([\s\S]*?)<\/dc:title>/i);
      author = firstMatch(cx, /<dc:creator>([\s\S]*?)<\/dc:creator>/i);
    }
    tick(1);
    return {
      text: paragraphs.join('\n\n'),
      title: title,
      author: author
    };
  });
  return _parseDocxFromBytes.apply(this, arguments);
}