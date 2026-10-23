var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseOdt = parseOdt;
exports.parseOdtFromBytes = parseOdtFromBytes;
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
    var cacheUri = `${FileSystem.cacheDirectory}br_odt_${Date.now()}.odt`;
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
function parseOdt(_x2, _x3) {
  return _parseOdt.apply(this, arguments);
}
function _parseOdt() {
  _parseOdt = (0, _asyncToGenerator2.default)(function* (uri, onProgress) {
    var tick = function tick(p) {
      return onProgress == null ? void 0 : onProgress(p);
    };
    tick(0.05);
    var base64 = yield readBase64(uri);
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return parseOdtFromBytes(bytes.buffer, onProgress);
  });
  return _parseOdt.apply(this, arguments);
}
function parseOdtFromBytes(_x4, _x5) {
  return _parseOdtFromBytes.apply(this, arguments);
}
function _parseOdtFromBytes() {
  _parseOdtFromBytes = (0, _asyncToGenerator2.default)(function* (arrayBuffer, onProgress) {
    var tick = function tick(p) {
      return onProgress == null ? void 0 : onProgress(p);
    };
    tick(0.05);
    var zip = yield _jszip.default.loadAsync(arrayBuffer);
    var contentFile = zip.file('content.xml') || zip.file('OEBPS/content.xml') || Object.values(zip.files).find(function (f) {
      return /content\.xml$/i.test(f.name);
    });
    if (!contentFile) throw new Error((0, _i18n.tStatic)('Invalid ODT: missing content.xml'));
    var xml = yield contentFile.async('text');
    tick(0.25);
    var paraBlocks = xml.split(/<text:p[ >]/i).slice(1);
    var paragraphs = [];
    for (var block of paraBlocks) {
      var t = block.replace(/<[^>]+>/g, ' ');
      t = decodeEntities(t).replace(/\s+/g, ' ').trim();
      if (t) paragraphs.push(t);
    }
    tick(0.85);
    var meta = zip.file('meta.xml');
    var title, author;
    if (meta) {
      var mx = yield meta.async('text');
      title = firstMatch(mx, /<dc:title>([\s\S]*?)<\/dc:title>/i);
      author = firstMatch(mx, /<dc:creator>([\s\S]*?)<\/dc:creator>/i);
    }
    tick(1);
    return {
      text: paragraphs.join('\n\n'),
      title: title,
      author: author
    };
  });
  return _parseOdtFromBytes.apply(this, arguments);
}