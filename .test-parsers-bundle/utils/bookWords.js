var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.extractBookWords = extractBookWords;
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _wordTokenizer = require("./wordTokenizer");
function splitSentences(text) {
  return text.replace(/\s+/g, ' ').split(/(?<=[.!?…])\s+/).map(function (s) {
    return s.trim();
  }).filter(Boolean);
}
var WORD_RE = /[a-zA-Zа-яА-ЯїЇєЄіІґҐёЁ'-]+/g;
function extractBookWords(paragraphs) {
  var counts = new Map();
  var sentences = [];
  for (var p of paragraphs) sentences.push.apply(sentences, (0, _toConsumableArray2.default)(splitSentences(p.original)));
  var firstSentence = new Map();
  for (var s of sentences) {
    var tokens = (s.match(WORD_RE) || []).map(function (w) {
      return (0, _wordTokenizer.normalizeWord)(w);
    });
    var seenInThisSentence = new Set();
    for (var w of tokens) {
      if (w.length < 2 || seenInThisSentence.has(w)) continue;
      seenInThisSentence.add(w);
      if (!firstSentence.has(w)) firstSentence.set(w, s.length <= 260 ? s : s.slice(0, 257) + '...');
    }
  }
  for (var _p of paragraphs) {
    var _tokens = _p.original.split(/\s+/);
    for (var tok of _tokens) {
      var _w = (0, _wordTokenizer.normalizeWord)(tok);
      if (_w.length < 2) continue;
      var prev = counts.get(_w);
      if (prev) {
        prev.frequency += 1;
      } else {
        var _firstSentence$get;
        counts.set(_w, {
          frequency: 1,
          context: (_firstSentence$get = firstSentence.get(_w)) != null ? _firstSentence$get : ''
        });
      }
    }
  }
  return Array.from(counts.entries()).map(function (_ref) {
    var _ref2 = (0, _slicedToArray2.default)(_ref, 2),
      word = _ref2[0],
      v = _ref2[1];
    return {
      word: word,
      frequency: v.frequency,
      context: v.context
    };
  }).sort(function (a, b) {
    return b.frequency - a.frequency;
  });
}