Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.matchAnyTranslation = matchAnyTranslation;
exports.splitTranslations = splitTranslations;
function splitTranslations(rawTranslation) {
  if (!rawTranslation) return [];
  var parts = rawTranslation.split(/[,;/|\n\r]+/).map(function (s) {
    return s.trim();
  }).filter(function (s) {
    return s.length > 0;
  });
  var unique = [];
  var seen = new Set();
  for (var p of parts) {
    var norm = p.toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      unique.push(p);
    }
  }
  return unique.length > 0 ? unique : [rawTranslation.trim()];
}
function matchAnyTranslation(userAnswer, expectedTranslation) {
  if (!userAnswer || !expectedTranslation) return false;
  var normUser = userAnswer.trim().toLowerCase().replace(/[.,!?;:]/g, '');
  if (!normUser) return false;
  var variants = splitTranslations(expectedTranslation);
  return variants.some(function (v) {
    var normV = v.trim().toLowerCase().replace(/[.,!?;:]/g, '');
    return normV === normUser;
  });
}