// utils/languages.ts
// Поддерживаемые языки (ISO 639-1 + названия). Русский (ru) НАМЕРЕННО УДАЛЁН.
// name — название на родном языке, en — на английском (для UI выбора).
// 'auto' обрабатывается отдельно в пикерах.
export interface LangOption {
  code: string;
  name: string; // родное название
  en: string; // английское название
}

export const LANGUAGES: LangOption[] = [
  { code: 'auto', name: 'Auto-detect', en: 'Auto-detect' },
  { code: 'en', name: 'English', en: 'English' },
  { code: 'uk', name: 'Українська', en: 'Ukrainian' },
  { code: 'de', name: 'Deutsch', en: 'German' },
  { code: 'fr', name: 'Français', en: 'French' },
  { code: 'es', name: 'Español', en: 'Spanish' },
  { code: 'it', name: 'Italiano', en: 'Italian' },
  { code: 'pt', name: 'Português', en: 'Portuguese' },
  { code: 'nl', name: 'Nederlands', en: 'Dutch' },
  { code: 'pl', name: 'Polski', en: 'Polish' },
  { code: 'tr', name: 'Türkçe', en: 'Turkish' },
  { code: 'cs', name: 'Čeština', en: 'Czech' },
  { code: 'sk', name: 'Slovenčina', en: 'Slovak' },
  { code: 'sv', name: 'Svenska', en: 'Swedish' },
  { code: 'da', name: 'Dansk', en: 'Danish' },
  { code: 'fi', name: 'Suomi', en: 'Finnish' },
  { code: 'no', name: 'Norsk', en: 'Norwegian' },
  { code: 'hu', name: 'Magyar', en: 'Hungarian' },
  { code: 'ro', name: 'Română', en: 'Romanian' },
  { code: 'bg', name: 'Български', en: 'Bulgarian' },
  { code: 'el', name: 'Ελληνικά', en: 'Greek' },
  { code: 'hr', name: 'Hrvatski', en: 'Croatian' },
  { code: 'sr', name: 'Српски', en: 'Serbian' },
  { code: 'sl', name: 'Slovenščina', en: 'Slovenian' },
  { code: 'et', name: 'Eesti', en: 'Estonian' },
  { code: 'lv', name: 'Latviešu', en: 'Latvian' },
  { code: 'lt', name: 'Lietuvių', en: 'Lithuanian' },
  { code: 'vi', name: 'Tiếng Việt', en: 'Vietnamese' },
  { code: 'th', name: 'ไทย', en: 'Thai' },
  { code: 'id', name: 'Indonesia', en: 'Indonesian' },
  { code: 'ms', name: 'Melayu', en: 'Malay' },
  { code: 'hi', name: 'हिन्दी', en: 'Hindi' },
  { code: 'he', name: 'עברית', en: 'Hebrew' },
  { code: 'fa', name: 'فارسی', en: 'Persian' },
  { code: 'ar', name: 'العربية', en: 'Arabic' },
  { code: 'sw', name: 'Kiswahili', en: 'Swahili' },
  { code: 'zh', name: '中文', en: 'Chinese' },
  { code: 'ja', name: '日本語', en: 'Japanese' },
  { code: 'ko', name: '한국어', en: 'Korean' },
  { code: 'ca', name: 'Català', en: 'Catalan' },
  { code: 'eu', name: 'Euskara', en: 'Basque' },
  { code: 'gl', name: 'Galego', en: 'Galician' },
  { code: 'cy', name: 'Cymraeg', en: 'Welsh' },
  { code: 'af', name: 'Afrikaans', en: 'Afrikaans' },
  { code: 'is', name: 'Íslenska', en: 'Icelandic' },
];

export function langName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

// Для списка языков перевода (без 'auto', без 'ru' — русский только для чтения, не для перевода).
export function translatableLangs(): LangOption[] {
  return LANGUAGES.filter((l) => l.code !== 'auto' && l.code !== 'ru');
}
