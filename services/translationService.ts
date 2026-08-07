// services/translationService.ts
// Единый плагинный слой перевода.
// MVP-бэкенд: Google "gtx" (без API-ключа). Позже подменяется на DeepL/Google Paid
// путём смены TRANSLATION_BACKEND — остальной код трогать не нужно.

export type LangCode = string; // ISO 639-1, напр. 'en', 'ru', 'de', 'fr', 'es', 'zh'

export interface TranslateResult {
  text: string;
  detectedSourceLang?: LangCode;
}

export type TranslationBackend = 'googleGtx' | 'googlePaid' | 'deepl';

// Переключается перед публикацией на 'googlePaid' / 'deepl' + API-ключ из env.
let activeBackend: TranslationBackend = 'googleGtx';
let apiKey: string | null = null;

export function configureTranslation(backend: TranslationBackend, key?: string) {
  activeBackend = backend;
  apiKey = key ?? null;
}

export function getActiveBackend(): TranslationBackend {
  return activeBackend;
}

async function viaGoogleGtx(text: string, from: LangCode, to: LangCode): Promise<TranslateResult> {
  // Бесплатный неофициальный endpoint Google Translate (client=gtx). Без ключа.
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${from}&tl=${to}&q=${encodeURIComponent(
      text,
    )}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google GTX translation failed: ${res.status}`);
  }
  const data = await res.json();
  // data[0] — массив сегментов [translatedChunk, originalChunk, ...]
  const translated = (data[0] as Array<[string]>)
    .map((seg) => (seg && seg[0] ? seg[0] : ''))
    .join('');
  const detected = (data[2] as LangCode) ?? undefined;
  return { text: translated, detectedSourceLang: detected };
}

async function viaGooglePaid(text: string, from: LangCode, to: LangCode): Promise<TranslateResult> {
  if (!apiKey) throw new Error('Google Paid backend requires API key');
  // Google Cloud Translation v2 (простой JSON endpoint). Заменить host/формат при v3.
  const res = await fetch('https://translation.googleapis.com/language/translate/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
    body: JSON.stringify({ q: text, source: from, target: to, format: 'text' }),
  });
  if (!res.ok) throw new Error(`Google Paid translation failed: ${res.status}`);
  const data = await res.json();
  return {
    text: data?.data?.translations?.[0]?.translatedText ?? '',
    detectedSourceLang: data?.data?.translations?.[0]?.detectedSourceLanguage,
  };
}

async function viaDeepl(text: string, from: LangCode, to: LangCode): Promise<TranslateResult> {
  if (!apiKey) throw new Error('DeepL backend requires API key');
  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `DeepL-Auth-Key ${apiKey}` },
    body: new URLSearchParams({ text, source_lang: from.toUpperCase(), target_lang: to.toUpperCase() }).toString(),
  });
  if (!res.ok) throw new Error(`DeepL translation failed: ${res.status}`);
  const data = await res.json();
  return {
    text: data?.translations?.[0]?.text ?? '',
    detectedSourceLang: data?.translations?.[0]?.detected_source_language?.toLowerCase(),
  };
}

/**
 * Переводит текст. Поддерживает 'auto' как исходный язык (автоопределение).
 */
export async function translate(
  text: string,
  from: LangCode,
  to: LangCode,
): Promise<TranslateResult> {
  if (!text.trim()) return { text: '' };
  switch (activeBackend) {
    case 'googlePaid':
      return viaGooglePaid(text, from, to);
    case 'deepl':
      return viaDeepl(text, from, to);
    case 'googleGtx':
    default:
      return viaGoogleGtx(text, from, to);
  }
}

// Простая in-memory кэш-обёртка, чтобы не дёргать сеть на каждый клик по слову.
const cache = new Map<string, TranslateResult>();
export async function translateCached(text: string, from: LangCode, to: LangCode): Promise<TranslateResult> {
  const key = `${from}|${to}|${text}`;
  if (cache.has(key)) return cache.get(key)!;
  const result = await translate(text, from, to);
  cache.set(key, result);
  return result;
}
