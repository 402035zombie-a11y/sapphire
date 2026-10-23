Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.effectiveLang = void 0;
var effectiveLang = exports.effectiveLang = function effectiveLang(lang) {
  return lang && lang !== 'auto' ? lang : 'en';
};