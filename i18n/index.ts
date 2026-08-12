// i18n/index.ts
// Минимальный слой интернационализации интерфейса.
// Ключ перевода = английская фраза (свободный fallback на английский).
// en → возвращает ключ как есть. uk → полный перевод. language=auto/system →
// берёт локаль устройства (navigator.language), русский принудительно → английский.
import { useCallback } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import {afDict} from './af';
import {arDict} from './ar';
import {bgDict} from './bg';
import {caDict} from './ca';
import {csDict} from './cs';
import {cyDict} from './cy';
import {daDict} from './da';
import {deDict} from './de';
import {elDict} from './el';
import {esDict} from './es';
import {etDict} from './et';
import {euDict} from './eu';
import {faDict} from './fa';
import {fiDict} from './fi';
import {frDict} from './fr';
import {glDict} from './gl';
import {heDict} from './he';
import {hiDict} from './hi';
import {hrDict} from './hr';
import {huDict} from './hu';
import {idDict} from './id';
import {isDict} from './is';
import {itDict} from './it';
import {jaDict} from './ja';
import {koDict} from './ko';
import {ltDict} from './lt';
import {lvDict} from './lv';
import {msDict} from './ms';
import {nlDict} from './nl';
import {noDict} from './no';
import {plDict} from './pl';
import {ptDict} from './pt';
import {roDict} from './ro';
import {skDict} from './sk';
import {slDict} from './sl';
import {srDict} from './sr';
import {svDict} from './sv';
import {swDict} from './sw';
import {thDict} from './th';
import {trDict} from './tr';
import {ukDict} from './uk';
import {viDict} from './vi';
import {zhDict} from './zh';
const dicts: Record<string, Record<string, string>> = {
  af: afDict,
  ar: arDict,
  bg: bgDict,
  ca: caDict,
  cs: csDict,
  cy: cyDict,
  da: daDict,
  de: deDict,
  el: elDict,
  es: esDict,
  et: etDict,
  eu: euDict,
  fa: faDict,
  fi: fiDict,
  fr: frDict,
  gl: glDict,
  he: heDict,
  hi: hiDict,
  hr: hrDict,
  hu: huDict,
  id: idDict,
  is: isDict,
  it: itDict,
  ja: jaDict,
  ko: koDict,
  lt: ltDict,
  lv: lvDict,
  ms: msDict,
  nl: nlDict,
  no: noDict,
  pl: plDict,
  pt: ptDict,
  ro: roDict,
  sk: skDict,
  sl: slDict,
  sr: srDict,
  sv: svDict,
  sw: swDict,
  th: thDict,
  tr: trDict,
  uk: ukDict,
  vi: viDict,
  zh: zhDict,
};

// Разрешает appLang ('auto' | 'system' | ISO) в конкретный ISO-код для перевода UI.
export function resolveAppLang(appLang: string): string {
  if (!appLang || appLang === 'en') return 'en';
  if (appLang === 'auto' || appLang === 'system') {
    const sys =
      (typeof navigator !== 'undefined' && (navigator.language || (navigator as any).userLanguage)) || 'en';
    const code = sys.split('-')[0].toLowerCase();
    // Русский не поддерживается приложением — принудительно английский.
    return code === 'ru' ? 'en' : code;
  }
  return appLang === 'ru' ? 'en' : appLang;
}

export function translateUi(appLang: string, en: string): string {
  const lang = resolveAppLang(appLang);
  if (lang === 'en') return en;
  const d = dicts[lang];
  if (!d) return en;
  return d[en] ?? en;
}

/** Хук: возвращает функцию t(en) для текущего языка приложения. */
export function useT() {
  const appLang = useSettingsStore((s) => s.appLang);
  return useCallback((en: string) => translateUi(appLang, en), [appLang]);
}

/** Вне React (plain functions, сервисы). */
export function tStatic(en: string): string {
  const appLang = useSettingsStore.getState().appLang;
  return translateUi(appLang, en);
}
