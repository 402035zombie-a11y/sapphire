// services/translationService.ts
// Слой перевода. Всегда используется бесплатный Google GTX (без API-ключа).
// Выбор поставщика/ключа убран — перевод всегда бесплатный.

export type LangCode = string; // ISO 639-1, напр. 'en', 'ru', 'de', 'fr', 'es', 'zh'

export interface TranslateResult {
  text: string;
  detectedSourceLang?: LangCode;
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

/**
 * Переводит текст. Поддерживает 'auto' как исходный язык (автоопределение).
 * Всегда бесплатный Google GTX.
 */
export async function translate(
  text: string,
  from: LangCode,
  to: LangCode,
): Promise<TranslateResult> {
  if (!text.trim()) return { text: '' };
  return viaGoogleGtx(text, from, to);
}

// Простая in-memory кэш-обёртка, чтобы не дёргать сеть на каждый клик по слову.
// LRU с лимитом — иначе Map растёт бесконечно на больших книгах и течёт память.
const CACHE_LIMIT = 2000;
const cache = new Map<string, TranslateResult>();
export async function translateCached(text: string, from: LangCode, to: LangCode): Promise<TranslateResult> {
  const key = `${from}|${to}|${text}`;
  const hit = cache.get(key);
  if (hit) {
    // обновляем позицию в LRU (переносим в конец)
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const result = await translate(text, from, to);
  cache.set(key, result);
  if (cache.size > CACHE_LIMIT) {
    // удаляем самый старый (первый в insert-order Map)
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return result;
}
