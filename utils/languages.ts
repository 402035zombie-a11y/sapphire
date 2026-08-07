// utils/languages.ts
// Поддерживаемые языки (код ISO + название на русском для UI).
// Пополняется по необходимости; 'auto' обрабатывается отдельно в пикерах.
export interface LangOption {
  code: string;
  name: string; // отображаемое имя (RU)
}

export const LANGUAGES: LangOption[] = [
  { code: 'auto', name: 'Автоопределение' },
  { code: 'en', name: 'Английский' },
  { code: 'ru', name: 'Русский' },
  { code: 'de', name: 'Немецкий' },
  { code: 'fr', name: 'Французский' },
  { code: 'es', name: 'Испанский' },
  { code: 'it', name: 'Итальянский' },
  { code: 'pt', name: 'Португальский' },
  { code: 'nl', name: 'Нидерландский' },
  { code: 'pl', name: 'Польский' },
  { code: 'tr', name: 'Турецкий' },
  { code: 'uk', name: 'Украинский' },
  { code: 'zh', name: 'Китайский' },
  { code: 'ja', name: 'Японский' },
  { code: 'ko', name: 'Корейский' },
  { code: 'ar', name: 'Арабский' },
];

export function langName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}
