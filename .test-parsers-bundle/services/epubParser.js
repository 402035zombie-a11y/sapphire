var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseEpub = parseEpub;
exports.parseEpubFromBytes = parseEpubFromBytes;
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _jszip = _interopRequireDefault(require("jszip"));
var _i18n = require("../i18n");
var _htmlEntities = require("../utils/htmlEntities");
function decodeEntities(s) {
  return (0, _htmlEntities.decodeHtmlEntities)(s);
}
function stripHtml(html) {
  var t = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  t = t.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  t = t.replace(/<\s*(p|div|br|h[1-6]|li|\/p|\/div|\/h[1-6]|\/li)\s*\/?\s*>/gi, '\n');
  t = t.replace(/<[^>]+>/g, ' ');
  t = decodeEntities(t);
  t = t.replace(/[ \t]+/g, ' ');
  t = t.replace(/\n{2,}/g, '\n');
  return t.trim();
}
function resolvePath(baseDir, href) {
  var parts = baseDir ? baseDir.split('/') : [];
  for (var seg of href.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();else parts.push(seg);
  }
  return parts.join('/');
}
function firstMatch(xml, re) {
  var m = xml.match(re);
  return m && m[1] ? decodeEntities(m[1].trim()) : undefined;
}
function parseEpub(_x, _x2) {
  return _parseEpub.apply(this, arguments);
}
function _parseEpub() {
  _parseEpub = (0, _asyncToGenerator2.default)(function* (uri, onProgress) {
    var emit = onProgress ? throttle(onProgress, 250) : undefined;
    var last = 0;
    var tick = function tick(p) {
      if (p - last >= 0.02 || p >= 1) {
        last = p;
        emit == null || emit(p);
      }
    };
    tick(0.05);
    var FileSystem = require('expo-file-system/legacy');
    var base64;
    if (/^https?:\/\//i.test(uri)) {
      var buf = yield (yield fetch(uri)).arrayBuffer();
      base64 = btoa(String.fromCharCode.apply(String, (0, _toConsumableArray2.default)(new Uint8Array(buf))));
    } else {
      var cacheUri = `${FileSystem.cacheDirectory}br_epub_${Date.now()}.epub`;
      yield FileSystem.copyAsync({
        from: uri,
        to: cacheUri
      });
      base64 = yield FileSystem.readAsStringAsync(cacheUri, {
        encoding: 'base64'
      });
    }
    tick(0.25);
    var zip = yield _jszip.default.loadAsync(base64, {
      base64: true
    });
    var containerFile = zip.file('META-INF/container.xml');
    if (!containerFile) throw new Error((0, _i18n.tStatic)('Invalid EPUB: missing META-INF/container.xml'));
    var containerXml = yield containerFile.async('text');
    var opfRelPath = firstMatch(containerXml, /full-path="([^"]+)"/i);
    if (!opfRelPath) throw new Error((0, _i18n.tStatic)('OPF path not found in container.xml'));
    var opfFile = zip.file(opfRelPath);
    if (!opfFile) throw new Error((0, _i18n.tStatic)('OPF not found in archive: {path}').replace('{path}', opfRelPath));
    var opfXml = yield opfFile.async('text');
    var opfDir = opfRelPath.includes('/') ? opfRelPath.slice(0, opfRelPath.lastIndexOf('/')) : '';
    var manifest = {};
    var itemRe = /<item\b[^>]*?>/gi;
    var im;
    while (im = itemRe.exec(opfXml)) {
      var tag = im[0];
      var idM = tag.match(/\bid="([^"]+)"/i);
      var hrefM = tag.match(/\bhref="([^"]+)"/i);
      var mtM = tag.match(/\bmedia-type="([^"]+)"/i);
      if (idM && hrefM && mtM) {
        manifest[idM[1]] = {
          href: hrefM[1],
          mediaType: mtM[1]
        };
      }
    }
    var coverHref = null;
    var coverType = 'image/jpeg';
    var firstImageHref = null;
    var firstImageType = 'image/jpeg';
    for (var _ref of Object.entries(manifest)) {
      var _ref2 = (0, _slicedToArray2.default)(_ref, 2);
      var id = _ref2[0];
      var m = _ref2[1];
      if (!/image\//i.test(m.mediaType)) continue;
      if (!firstImageHref) {
        firstImageHref = m.href;
        firstImageType = m.mediaType;
      }
      coverType = m.mediaType;
      var props = opfXml.match(new RegExp(`<item\\b[^>]*\\bid="${id}"[^>]*\\bproperties="([^"]*)"`, 'i'));
      if (props && /cover-image/i.test(props[1])) {
        coverHref = m.href;
        break;
      }
      if (/cover/i.test(id)) {
        coverHref = m.href;
        break;
      }
    }
    if (!coverHref) {
      coverHref = firstImageHref;
      coverType = firstImageType;
    }
    var cover;
    if (coverHref) {
      var cands = [resolvePath(opfDir, coverHref), coverHref.replace(/^OEBPS\//i, ''), `OEBPS/${coverHref.replace(/^OEBPS\//i, '')}`];
      for (var c of cands) {
        var f = zip.file(c);
        if (f) {
          var b64 = yield f.async('base64');
          cover = `data:${coverType};base64,${b64}`;
          break;
        }
      }
    }
    var spineBlock = opfXml.match(/<spine\b[\s\S]*?<\/spine>/i);
    var orderedHrefs = [];
    if (spineBlock) {
      var refRe = /<itemref\b[^>]*?\bidref="([^"]+)"/gi;
      var rm;
      while (rm = refRe.exec(spineBlock[0])) {
        var _manifest$rm$;
        var href = (_manifest$rm$ = manifest[rm[1]]) == null ? void 0 : _manifest$rm$.href;
        if (href) orderedHrefs.push(resolvePath(opfDir, href));
      }
    }
    if (orderedHrefs.length === 0) {
      Object.values(manifest).forEach(function (m) {
        return orderedHrefs.push(resolvePath(opfDir, m.href));
      });
    }
    var paragraphs = [];
    for (var i = 0; i < orderedHrefs.length; i++) {
      var _href = orderedHrefs[i];
      var candidates = [_href, opfDir ? `${opfDir}/${_href}` : _href, _href.replace(/^OEBPS\//i, ''), _href.replace(/^OEBPS\//i, '').replace(/^\//, ''), `OEBPS/${_href.replace(/^OEBPS\//i, '')}`];
      var file = null;
      for (var _c of candidates) {
        file = zip.file(_c);
        if (file) break;
      }
      if (!file) continue;
      var raw = yield file.async('text');
      var text = stripHtml(raw);
      if (text) paragraphs.push(text);
      tick(0.3 + 0.6 * (i + 1) / orderedHrefs.length);
      if ((i & 3) === 3) {
        yield new Promise(function (r) {
          return setTimeout(r, 0);
        });
      }
    }
    var title = firstMatch(opfXml, /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
    var author = firstMatch(opfXml, /<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);
    tick(1);
    return {
      text: paragraphs.join('\n\n'),
      title: title,
      author: author,
      cover: cover
    };
  });
  return _parseEpub.apply(this, arguments);
}
function parseEpubFromBytes(_x3, _x4) {
  return _parseEpubFromBytes.apply(this, arguments);
}
function _parseEpubFromBytes() {
  _parseEpubFromBytes = (0, _asyncToGenerator2.default)(function* (bytes, onProgress) {
    var emit = onProgress ? throttle(onProgress, 250) : undefined;
    var last = 0;
    var tick = function tick(p) {
      if (p - last >= 0.02 || p >= 1) {
        last = p;
        emit == null || emit(p);
      }
    };
    tick(0.05);
    var zip = yield _jszip.default.loadAsync(bytes);
    var containerFile = zip.file('META-INF/container.xml');
    if (!containerFile) throw new Error((0, _i18n.tStatic)('Invalid EPUB: missing META-INF/container.xml'));
    var containerXml = yield containerFile.async('text');
    var opfRelPath = firstMatch(containerXml, /full-path="([^"]+)"/i);
    if (!opfRelPath) throw new Error((0, _i18n.tStatic)('OPF path not found in container.xml'));
    var opfFile = zip.file(opfRelPath);
    if (!opfFile) throw new Error((0, _i18n.tStatic)('OPF not found in archive: {path}').replace('{path}', opfRelPath));
    var opfXml = yield opfFile.async('text');
    var opfDir = opfRelPath.includes('/') ? opfRelPath.slice(0, opfRelPath.lastIndexOf('/')) : '';
    var manifest = {};
    var itemRe = /<item\b[^>]*?>/gi;
    var im;
    while (im = itemRe.exec(opfXml)) {
      var tag = im[0];
      var idM = tag.match(/\bid="([^"]+)"/i);
      var hrefM = tag.match(/\bhref="([^"]+)"/i);
      var mtM = tag.match(/\bmedia-type="([^"]+)"/i);
      if (idM && hrefM && mtM) {
        manifest[idM[1]] = {
          href: hrefM[1],
          mediaType: mtM[1]
        };
      }
    }
    var coverHref = null;
    var coverType = 'image/jpeg';
    var firstImageHref = null;
    var firstImageType = 'image/jpeg';
    for (var _ref3 of Object.entries(manifest)) {
      var _ref4 = (0, _slicedToArray2.default)(_ref3, 2);
      var id = _ref4[0];
      var m = _ref4[1];
      if (!/image\//i.test(m.mediaType)) continue;
      if (!firstImageHref) {
        firstImageHref = m.href;
        firstImageType = m.mediaType;
      }
      coverType = m.mediaType;
      var props = opfXml.match(new RegExp(`<item\\b[^>]*\\bid="${id}"[^>]*\\bproperties="([^"]*)"`, 'i'));
      if (props && /cover-image/i.test(props[1])) {
        coverHref = m.href;
        break;
      }
      if (/cover/i.test(id)) {
        coverHref = m.href;
        break;
      }
    }
    if (!coverHref) {
      coverHref = firstImageHref;
      coverType = firstImageType;
    }
    var cover;
    if (coverHref) {
      var cands = [resolvePath(opfDir, coverHref), coverHref.replace(/^OEBPS\//i, ''), `OEBPS/${coverHref.replace(/^OEBPS\//i, '')}`];
      for (var c of cands) {
        var f = zip.file(c);
        if (f) {
          var b64 = yield f.async('base64');
          cover = `data:${coverType};base64,${b64}`;
          break;
        }
      }
    }
    var spineBlock = opfXml.match(/<spine\b[\s\S]*?<\/spine>/i);
    var orderedHrefs = [];
    if (spineBlock) {
      var refRe = /<itemref\b[^>]*?\bidref="([^"]+)"/gi;
      var rm;
      while (rm = refRe.exec(spineBlock[0])) {
        var _manifest$rm$2;
        var href = (_manifest$rm$2 = manifest[rm[1]]) == null ? void 0 : _manifest$rm$2.href;
        if (href) orderedHrefs.push(resolvePath(opfDir, href));
      }
    }
    if (orderedHrefs.length === 0) {
      Object.values(manifest).forEach(function (m) {
        return orderedHrefs.push(resolvePath(opfDir, m.href));
      });
    }
    var paragraphs = [];
    for (var i = 0; i < orderedHrefs.length; i++) {
      var _href2 = orderedHrefs[i];
      var candidates = [_href2, opfDir ? `${opfDir}/${_href2}` : _href2, _href2.replace(/^OEBPS\//i, ''), _href2.replace(/^OEBPS\//i, '').replace(/^\//, ''), `OEBPS/${_href2.replace(/^OEBPS\//i, '')}`];
      var file = null;
      for (var _c2 of candidates) {
        file = zip.file(_c2);
        if (file) break;
      }
      if (!file) continue;
      var raw = yield file.async('text');
      var text = stripHtml(raw);
      if (text) paragraphs.push(text);
      tick(0.3 + 0.6 * (i + 1) / orderedHrefs.length);
      if ((i & 3) === 3) {
        yield new Promise(function (r) {
          return setTimeout(r, 0);
        });
      }
    }
    var title = firstMatch(opfXml, /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
    var author = firstMatch(opfXml, /<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);
    tick(1);
    return {
      text: paragraphs.join('\n\n'),
      title: title,
      author: author,
      cover: cover
    };
  });
  return _parseEpubFromBytes.apply(this, arguments);
}
function throttle(fn, minMs) {
  var last = 0;
  var pending = false;
  return function (p) {
    if (p >= 1) {
      fn(p);
      return;
    }
    var now = Date.now();
    if (now - last >= minMs) {
      last = now;
      fn(p);
    } else if (!pending) {
      pending = true;
      setTimeout(function () {
        pending = false;
        fn(p);
      }, minMs);
    }
  };
}