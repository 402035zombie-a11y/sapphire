var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseHtml = parseHtml;
exports.parseHtmlFromBytes = parseHtmlFromBytes;
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _htmlEntities = require("../utils/htmlEntities");
var FileSystem = require('expo-file-system/legacy');
function readText(_x) {
  return _readText.apply(this, arguments);
}
function _readText() {
  _readText = (0, _asyncToGenerator2.default)(function* (uri) {
    if (/^https?:\/\//i.test(uri)) return yield (yield fetch(uri)).text();
    var cacheUri = `${FileSystem.cacheDirectory}br_html_${Date.now()}.html`;
    yield FileSystem.copyAsync({
      from: uri,
      to: cacheUri
    });
    return FileSystem.readAsStringAsync(cacheUri, {
      encoding: 'utf8'
    });
  });
  return _readText.apply(this, arguments);
}
function decodeEntities(s) {
  return (0, _htmlEntities.decodeHtmlEntities)(s);
}
function parseHtml(_x2, _x3) {
  return _parseHtml.apply(this, arguments);
}
function _parseHtml() {
  _parseHtml = (0, _asyncToGenerator2.default)(function* (uri, onProgress) {
    var html = yield readText(uri);
    return parseHtmlFromString(html, onProgress);
  });
  return _parseHtml.apply(this, arguments);
}
function parseHtmlFromBytes(_x4, _x5) {
  return _parseHtmlFromBytes.apply(this, arguments);
}
function _parseHtmlFromBytes() {
  _parseHtmlFromBytes = (0, _asyncToGenerator2.default)(function* (arrayBuffer, onProgress) {
    var html = new TextDecoder('utf-8').decode(new Uint8Array(arrayBuffer));
    return parseHtmlFromString(html, onProgress);
  });
  return _parseHtmlFromBytes.apply(this, arguments);
}
function parseHtmlFromString(_x6, _x7) {
  return _parseHtmlFromString.apply(this, arguments);
}
function _parseHtmlFromString() {
  _parseHtmlFromString = (0, _asyncToGenerator2.default)(function* (html, onProgress) {
    var tick = function tick(p) {
      return onProgress == null ? void 0 : onProgress(p);
    };
    tick(0.1);
    tick(0.5);
    var t = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
    t = t.replace(/<style[\s\S]*?<\/style>/gi, ' ');
    t = t.replace(/<(p|div|br|h[1-6]|li|\/p|\/div|\/h[1-6]|\/li)\b[^>]*\/?>/gi, '\n');
    t = t.replace(/<[^>]+>/g, ' ');
    t = decodeEntities(t).replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
    var titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    tick(1);
    return {
      text: t,
      title: titleM ? decodeEntities(titleM[1].trim()) : undefined
    };
  });
  return _parseHtmlFromString.apply(this, arguments);
}