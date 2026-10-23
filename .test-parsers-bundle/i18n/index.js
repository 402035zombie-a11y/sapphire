Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolveAppLang = resolveAppLang;
exports.tStatic = tStatic;
exports.translateUi = translateUi;
exports.useT = useT;
var _react = require("react");
var _settingsStore = require("../store/settingsStore");
var _af = require("./af");
var _ar = require("./ar");
var _bg = require("./bg");
var _ca = require("./ca");
var _cs = require("./cs");
var _cy = require("./cy");
var _da = require("./da");
var _de = require("./de");
var _el = require("./el");
var _es = require("./es");
var _et = require("./et");
var _eu = require("./eu");
var _fa = require("./fa");
var _fi = require("./fi");
var _fr = require("./fr");
var _gl = require("./gl");
var _he = require("./he");
var _hi = require("./hi");
var _hr = require("./hr");
var _hu = require("./hu");
var _id = require("./id");
var _is = require("./is");
var _it = require("./it");
var _ja = require("./ja");
var _ko = require("./ko");
var _lt = require("./lt");
var _lv = require("./lv");
var _ms = require("./ms");
var _nl = require("./nl");
var _no = require("./no");
var _pl = require("./pl");
var _pt = require("./pt");
var _ro = require("./ro");
var _sk = require("./sk");
var _sl = require("./sl");
var _sr = require("./sr");
var _sv = require("./sv");
var _sw = require("./sw");
var _th = require("./th");
var _tr = require("./tr");
var _uk = require("./uk");
var _vi = require("./vi");
var _zh = require("./zh");
var dicts = {
  af: _af.afDict,
  ar: _ar.arDict,
  bg: _bg.bgDict,
  ca: _ca.caDict,
  cs: _cs.csDict,
  cy: _cy.cyDict,
  da: _da.daDict,
  de: _de.deDict,
  el: _el.elDict,
  es: _es.esDict,
  et: _et.etDict,
  eu: _eu.euDict,
  fa: _fa.faDict,
  fi: _fi.fiDict,
  fr: _fr.frDict,
  gl: _gl.glDict,
  he: _he.heDict,
  hi: _hi.hiDict,
  hr: _hr.hrDict,
  hu: _hu.huDict,
  id: _id.idDict,
  is: _is.isDict,
  it: _it.itDict,
  ja: _ja.jaDict,
  ko: _ko.koDict,
  lt: _lt.ltDict,
  lv: _lv.lvDict,
  ms: _ms.msDict,
  nl: _nl.nlDict,
  no: _no.noDict,
  pl: _pl.plDict,
  pt: _pt.ptDict,
  ro: _ro.roDict,
  sk: _sk.skDict,
  sl: _sl.slDict,
  sr: _sr.srDict,
  sv: _sv.svDict,
  sw: _sw.swDict,
  th: _th.thDict,
  tr: _tr.trDict,
  uk: _uk.ukDict,
  vi: _vi.viDict,
  zh: _zh.zhDict
};
function resolveAppLang(appLang) {
  if (!appLang || appLang === 'en') return 'en';
  if (appLang === 'auto' || appLang === 'system') {
    var sys = typeof navigator !== 'undefined' && (navigator.language || navigator.userLanguage) || 'en';
    var code = sys.split('-')[0].toLowerCase();
    return code === 'ru' ? 'en' : code;
  }
  return appLang === 'ru' ? 'en' : appLang;
}
function translateUi(appLang, en) {
  var _d$en;
  var lang = resolveAppLang(appLang);
  if (lang === 'en') return en;
  var d = dicts[lang];
  if (!d) return en;
  return (_d$en = d[en]) != null ? _d$en : en;
}
function useT() {
  var appLang = (0, _settingsStore.useSettingsStore)(function (s) {
    return s.appLang;
  });
  return (0, _react.useCallback)(function (en) {
    return translateUi(appLang, en);
  }, [appLang]);
}
function tStatic(en) {
  var appLang = _settingsStore.useSettingsStore.getState().appLang;
  return translateUi(appLang, en);
}