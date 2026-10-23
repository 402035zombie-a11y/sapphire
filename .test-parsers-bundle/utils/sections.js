Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.extractSections = extractSections;
var _i18n = require("../i18n");
var SECTION_RE = /(^\s*(chapter|часть|глава|section|part|раздел|book|книга)\b)|(^\s*[IVXLCДЕИІ]+\b\.?\s)|(^\s*\d+[\.\)]\s)/i;
function extractSections(paragraphs) {
  var sections = [];
  for (var p of paragraphs) {
    var text = p.original.trim();
    if (text.length === 0 || text.length > 70) continue;
    var firstLine = text.split('\n')[0].trim();
    var looksLike = SECTION_RE.test(firstLine) || firstLine === firstLine.toUpperCase() && /[A-ZА-ЯІЇЄ]/.test(firstLine) && firstLine.length <= 50 || /^(chapter|глава|часть|section|part|раздел)\s+/i.test(firstLine);
    if (looksLike) {
      sections.push({
        title: firstLine.slice(0, 80),
        paragraphIndex: p.index
      });
    }
  }
  if (sections.length === 0 && paragraphs.length > 0) {
    sections.push({
      title: (0, _i18n.tStatic)('Beginning'),
      paragraphIndex: 0
    });
  }
  return sections;
}