// i18n/index.ts
// Минимальный слой интернационализации интерфейса.
// Ключ перевода = английская фраза (свободный fallback на английский).
// en → возвращает ключ как есть. uk → полный перевод. language=auto/system →
// берёт локаль устройства (navigator.language), русский принудительно → английский.
import { useCallback } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { ukDict } from './uk';

const dicts: Record<string, Record<string, string>> = {
  uk: ukDict,
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
