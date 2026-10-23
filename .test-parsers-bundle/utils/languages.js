Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LANGUAGES = void 0;
exports.langName = langName;
exports.translatableLangs = translatableLangs;
var LANGUAGES = exports.LANGUAGES = [{
  code: 'auto',
  name: 'Auto-detect',
  en: 'Auto-detect'
}, {
  code: 'en',
  name: 'English',
  en: 'English'
}, {
  code: 'uk',
  name: 'Українська',
  en: 'Ukrainian'
}, {
  code: 'de',
  name: 'Deutsch',
  en: 'German'
}, {
  code: 'fr',
  name: 'Français',
  en: 'French'
}, {
  code: 'es',
  name: 'Español',
  en: 'Spanish'
}, {
  code: 'it',
  name: 'Italiano',
  en: 'Italian'
}, {
  code: 'pt',
  name: 'Português',
  en: 'Portuguese'
}, {
  code: 'nl',
  name: 'Nederlands',
  en: 'Dutch'
}, {
  code: 'pl',
  name: 'Polski',
  en: 'Polish'
}, {
  code: 'tr',
  name: 'Türkçe',
  en: 'Turkish'
}, {
  code: 'cs',
  name: 'Čeština',
  en: 'Czech'
}, {
  code: 'sk',
  name: 'Slovenčina',
  en: 'Slovak'
}, {
  code: 'sv',
  name: 'Svenska',
  en: 'Swedish'
}, {
  code: 'da',
  name: 'Dansk',
  en: 'Danish'
}, {
  code: 'fi',
  name: 'Suomi',
  en: 'Finnish'
}, {
  code: 'no',
  name: 'Norsk',
  en: 'Norwegian'
}, {
  code: 'hu',
  name: 'Magyar',
  en: 'Hungarian'
}, {
  code: 'ro',
  name: 'Română',
  en: 'Romanian'
}, {
  code: 'bg',
  name: 'Български',
  en: 'Bulgarian'
}, {
  code: 'el',
  name: 'Ελληνικά',
  en: 'Greek'
}, {
  code: 'hr',
  name: 'Hrvatski',
  en: 'Croatian'
}, {
  code: 'sr',
  name: 'Српски',
  en: 'Serbian'
}, {
  code: 'sl',
  name: 'Slovenščina',
  en: 'Slovenian'
}, {
  code: 'et',
  name: 'Eesti',
  en: 'Estonian'
}, {
  code: 'lv',
  name: 'Latviešu',
  en: 'Latvian'
}, {
  code: 'lt',
  name: 'Lietuvių',
  en: 'Lithuanian'
}, {
  code: 'vi',
  name: 'Tiếng Việt',
  en: 'Vietnamese'
}, {
  code: 'th',
  name: 'ไทย',
  en: 'Thai'
}, {
  code: 'id',
  name: 'Indonesia',
  en: 'Indonesian'
}, {
  code: 'ms',
  name: 'Melayu',
  en: 'Malay'
}, {
  code: 'hi',
  name: 'हिन्दी',
  en: 'Hindi'
}, {
  code: 'he',
  name: 'עברית',
  en: 'Hebrew'
}, {
  code: 'fa',
  name: 'فارسی',
  en: 'Persian'
}, {
  code: 'ar',
  name: 'العربية',
  en: 'Arabic'
}, {
  code: 'sw',
  name: 'Kiswahili',
  en: 'Swahili'
}, {
  code: 'zh',
  name: '中文',
  en: 'Chinese'
}, {
  code: 'ja',
  name: '日本語',
  en: 'Japanese'
}, {
  code: 'ko',
  name: '한국어',
  en: 'Korean'
}, {
  code: 'ca',
  name: 'Català',
  en: 'Catalan'
}, {
  code: 'eu',
  name: 'Euskara',
  en: 'Basque'
}, {
  code: 'gl',
  name: 'Galego',
  en: 'Galician'
}, {
  code: 'cy',
  name: 'Cymraeg',
  en: 'Welsh'
}, {
  code: 'af',
  name: 'Afrikaans',
  en: 'Afrikaans'
}, {
  code: 'is',
  name: 'Íslenska',
  en: 'Icelandic'
}];
function langName(code) {
  var _LANGUAGES$find$name, _LANGUAGES$find;
  return (_LANGUAGES$find$name = (_LANGUAGES$find = LANGUAGES.find(function (l) {
    return l.code === code;
  })) == null ? void 0 : _LANGUAGES$find.name) != null ? _LANGUAGES$find$name : code;
}
function translatableLangs() {
  return LANGUAGES.filter(function (l) {
    return l.code !== 'auto' && l.code !== 'ru';
  });
}