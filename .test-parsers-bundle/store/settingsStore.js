Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useSettingsStore = void 0;
var _createStore = require("./createStore");
var useSettingsStore = exports.useSettingsStore = (0, _createStore.persist)(function (set) {
  return {
    appLang: 'auto',
    targetLang: 'uk',
    theme: 'night',
    reader: {
      fontSize: 14,
      lineHeight: 1,
      paragraphSpacing: 0,
      margin: 0,
      justify: true,
      fontFamily: 'default',
      fontWeight: 400,
      textAlign: 'justify',
      letterSpacing: 0,
      pageMargins: false,
      pageMarginPx: 0,
      highlightWords: true,
      dictionaryOnDoubleTap: true,
      showAllTranslations: false,
      microPauses: true,
      pauseCommaMs: 400,
      pauseSentMs: 400,
      pauseBracketMs: 400,
      showSpeakButton: true,
      showTranslateButton: true
    },
    setTargetLang: function setTargetLang(l) {
      return set({
        targetLang: l
      });
    },
    setAppLang: function setAppLang(l) {
      return set({
        appLang: l
      });
    },
    setTheme: function setTheme(t) {
      return set({
        theme: t
      });
    },
    setReader: function setReader(patch) {
      return set(function (s) {
        return {
          reader: Object.assign({}, s.reader, patch)
        };
      });
    }
  };
}, {
  name: 'sapphire-settings',
  partialize: function partialize(s) {
    return {
      targetLang: s.targetLang,
      theme: s.theme,
      reader: s.reader
    };
  }
});