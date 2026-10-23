Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isListItem = isListItem;
exports.splitIntoSegments = splitIntoSegments;
exports.splitIntoSentences = splitIntoSentences;
var ABBREV = /(mr|mrs|ms|dr|prof|etc|vs|jr|sr|st|fig|e\.g|i\.e|vol|no|al|co|inc|ltd|г-н|г-жа|тов|см|стр|рис|т\.д|т\.п)$/i;
var TERMINAL = '.!?…';
var LIST_MARKER = /^(\s*)(?:(?:\d+|[a-zA-Z]|[ivxlcdm]+|[IVXLCDM]+)[.)]|[-*•‣▪·◦▪])(\s|$)/;
function isListItem(s) {
  return LIST_MARKER.test(s.trim());
}
function hasListMarker(s) {
  var t = s.trim();
  if (isListItem(t)) return true;
  return /\n\s*(?:(?:\d+|[a-zA-Z]|[ivxlcdm]+|[IVXLCDM]+)[.)]|[-*•‣▪·◦▪])\s/.test(s);
}
function hasListMarkerAt(text, start) {
  var k = start;
  while (k < text.length && /\s/.test(text[k])) k++;
  return isListItemAt(text, k);
}
function isListItemAt(text, k) {
  var _text;
  if (k >= text.length) return false;
  var c = text[k];
  if ('-*•‣▪·◦▪'.includes(c)) return true;
  var m = k;
  while (m < text.length && /[0-9a-zA-ZivxlcdmIVXLCDM]/.test(text[m])) m++;
  if (m === k) return false;
  if (m >= text.length) return false;
  var sep = text[m];
  if (sep !== '.' && sep !== ')') return false;
  var after = (_text = text[m + 1]) != null ? _text : '';
  return m + 1 >= text.length || /\s/.test(after);
}
function listMarkerLenAt(text, start) {
  var k = start;
  while (k < text.length && /\s/.test(text[k])) k++;
  var begin = k;
  if ('-*•‣▪·◦▪'.includes(text[k])) return k - start + 1;
  while (k < text.length && /[0-9a-zA-ZivxlcdmIVXLCDM]/.test(text[k])) k++;
  if (k === begin) return 0;
  if (text[k] === '.' || text[k] === ')') k++;else return 0;
  return k - start;
}
function splitIntoSentences(text) {
  if (!text || !text.trim()) return [];
  var out = [];
  var start = 0;
  var n = text.length;
  var isBoundaryAt = function isBoundaryAt(i) {
    var _text2, _text$j;
    var c = text[i];
    if (!TERMINAL.includes(c)) return false;
    var before = (_text2 = text[i - 1]) != null ? _text2 : '';
    var j = i + 1;
    while (j < n && /\s/.test(text[j])) j++;
    var next = (_text$j = text[j]) != null ? _text$j : '';
    var nextIsBoundary = j >= n || /[A-ZА-ЯЄЇІҐЁ«"'(«0-9]/.test(next);
    if (!nextIsBoundary) return false;
    if (c === '.' && /\d/.test(before) && /\d/.test(next)) return false;
    if (hasListMarkerAt(text, start)) {
      var markerLen = listMarkerLenAt(text, start);
      if (markerLen > 0 && start + markerLen >= i + 1) return false;
      var nextIsSentenceStart = /[A-ZА-ЯЄЇІҐЁ«"'(«]/.test(next);
      if (nextIsSentenceStart) return true;
      var rest = text.slice(j).trimStart();
      return isListItem(rest) || !rest;
    }
    return true;
  };
  for (var i = 1; i < n; i++) {
    if (!isBoundaryAt(i)) continue;
    var j = i + 1;
    while (j < n && /\s/.test(text[j])) j++;
    var seg = text.slice(start, i + 1).trim();
    if (seg) out.push(seg);
    start = j;
    i = j - 1;
  }
  var tail = text.slice(start).trim();
  if (tail) out.push(tail);
  var merged = mergeAbbrevFragments(out);
  return mergeListItems(merged);
}
function mergeListItems(sentences) {
  var result = [];
  var i = 0;
  while (i < sentences.length) {
    if (isListItem(sentences[i]) && sentences[i].length < 80) {
      var chain = sentences[i];
      var k = i + 1;
      while (k < sentences.length && isListItem(sentences[k]) && sentences[k].length < 80) {
        chain += ' ' + sentences[k];
        k++;
      }
      result.push(chain.trim());
      i = k;
    } else {
      result.push(sentences[i]);
      i++;
    }
  }
  return result;
}
function mergeAbbrevFragments(sentences) {
  var merged = [];
  for (var s of sentences) {
    var prev = merged[merged.length - 1];
    if (prev && ABBREV.test(prev.replace(/[.!?…]+$/, '')) && !/[.!?…]$/.test(prev)) {
      merged[merged.length - 1] = `${prev} ${s}`;
    } else {
      merged.push(s);
    }
  }
  return merged;
}
function splitIntoSegments(text) {
  if (!text || !text.trim()) return [];
  var normalized = text.replace(/\r\n/g, '\n').replace(/[ \t]*\n[ \t]*/g, ' ').replace(/ {2,}/g, ' ').trim();
  var parts = splitIntoSentences(normalized);
  var MAX_SENT_CHARS = 200;
  return parts.map(function (p) {
    return p.trim();
  }).filter(Boolean).flatMap(function (s) {
    return splitLongSentence(s, MAX_SENT_CHARS);
  });
}
var SUB_SPLIT_MIN_PART = 40;
function splitLongSentence(sentence, maxChars) {
  if (sentence.length <= maxChars) return [sentence];
  var cuts = [];
  for (var i = 0; i < sentence.length; i++) {
    var c = sentence[i];
    if (c !== ':' && c !== ';') continue;
    var j = i + 1;
    while (j < sentence.length && /\s/.test(sentence[j])) j++;
    var rest = sentence.slice(j);
    if (rest.length < SUB_SPLIT_MIN_PART) continue;
    if (/^[A-ZА-ЯЄЇІҐЁ«"']/.test(rest)) continue;
    cuts.push(j);
  }
  if (cuts.length === 0) return [sentence];
  var out = [];
  var prev = 0;
  for (var cut of cuts) {
    var part = sentence.slice(prev, cut).trim();
    if (part) out.push(part);
    prev = cut;
  }
  var tail = sentence.slice(prev).trim();
  if (tail) out.push(tail);
  return out;
}