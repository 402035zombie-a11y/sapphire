var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseFb2 = parseFb2;
exports.parseFb2FromBytes = parseFb2FromBytes;
exports.parseFb2Text = parseFb2Text;
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _htmlEntities = require("../utils/htmlEntities");
function decodeEntities(s) {
  return (0, _htmlEntities.decodeHtmlEntities)(s);
}
function parseFb2Text(xml) {
  var _bodies$find;
  var title = matchTag(xml, 'book-title');
  var authorBlock = matchTag(xml, 'author');
  var author;
  if (authorBlock) {
    var first = matchTag(authorBlock, 'first-name');
    var last = matchTag(authorBlock, 'last-name');
    author = [first, last].filter(Boolean).join(' ') || undefined;
  }
  var bodies = (0, _toConsumableArray2.default)(xml.matchAll(/<body\b([^>]*)>([\s\S]*?)<\/body>/gi));
  var mainBody = (_bodies$find = bodies.find(function (b) {
    return !/\bname\s*=/.test(b[1]);
  })) != null ? _bodies$find : bodies[0];
  var bodyXml = mainBody ? mainBody[2] : xml;
  var text = bodyXml.replace(/<body\b[^>]*name=[^>]*>[\s\S]*?<\/body>/gi, ' ');
  text = text.replace(/<\s*(?:title|p|empty-line|li|subtitle|epigraph)\b[^>]*\/?\s*>/gi, '\n');
  text = text.replace(/<\s*\/\s*(?:title|p|li|subtitle|epigraph|section)\s*>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');
  text = decodeEntities(text);
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{2,}/g, '\n');
  text = text.trim();
  return {
    text: text,
    title: title,
    author: author
  };
}
function parseFb2(_x, _x2) {
  return _parseFb.apply(this, arguments);
}
function _parseFb() {
  _parseFb = (0, _asyncToGenerator2.default)(function* (uri, onProgress) {
    onProgress == null || onProgress(0.1);
    var raw;
    if (/^https?:\/\//i.test(uri)) {
      raw = yield (yield fetch(uri)).text();
    } else {
      var FS = require('expo-file-system/legacy');
      var cacheUri = `${FS.cacheDirectory}br_fb2_${Date.now()}.fb2`;
      yield FS.copyAsync({
        from: uri,
        to: cacheUri
      });
      raw = yield FS.readAsStringAsync(cacheUri, {
        encoding: 'utf8'
      });
    }
    onProgress == null || onProgress(0.4);
    var res = parseFb2Text(raw);
    onProgress == null || onProgress(1);
    return res;
  });
  return _parseFb.apply(this, arguments);
}
function parseFb2FromBytes(_x3, _x4) {
  return _parseFb2FromBytes.apply(this, arguments);
}
function _parseFb2FromBytes() {
  _parseFb2FromBytes = (0, _asyncToGenerator2.default)(function* (bytes, onProgress) {
    onProgress == null || onProgress(0.1);
    var raw = new TextDecoder('utf-8').decode(new Uint8Array(bytes));
    onProgress == null || onProgress(0.4);
    var res = parseFb2Text(raw);
    onProgress == null || onProgress(1);
    return res;
  });
  return _parseFb2FromBytes.apply(this, arguments);
}
function matchTag(xml, tag) {
  var m = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!m) return undefined;
  return decodeEntities(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}