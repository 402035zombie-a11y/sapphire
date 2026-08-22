/**
 * translationServiceV2.ts — E6: переклад (Lingva + фолбек на офлайн-словник).
 *
 * ЧОМУ ТАК (для наступного агента):
 *  - Старий translationService.ts використовував безключовий Google GTX (translate_a/single)
 *    → падає від лімітів/IP-банів. Це було головне джерело "нестабільного перекладу".
 *  - Рішення (spec 3.4): Lingva (відкритий фронтенд Google Translate, без ключа) + фолбек на
 *    офлайн-словник lookupWord(). Свій serverless Lingva-інстанс (Cloudflare/Vercel, $0) —
 *    URL тримаємо в .env (LINGVA_BASE_URL), щоб не хардкодити і легко міняти.
 *  - Graceful degrade: якщо Lingva недоступна → повертаємо офлайн-словник (не краш).
 *
 * LINGVA_BASE_URL має вказувати на /api/v1 (інстанс віддає GET /api/v1/{from}/{to}/{q}).
 */
import { lookupWord, isDictLoaded } from './dictionaryLookup';
import { translateCached as gtxTranslateCached } from './translationService';

export type LangCode = string;

export interface TranslateResult {
  text: string;
  detectedSourceLang?: LangCode;
  source: 'lingva' | 'offline-dict' | 'none';
}

const LINGVA_BASE = (process.env.LINGVA_BASE_URL ?? '').replace(/\/$/, '');

export async function translate(
  text: string,
  from: LangCode,
  to: LangCode
): Promise<TranslateResult> {
  if (!text.trim()) return { text: '', source: 'none' };

  // 0) Якщо Lingva-інстанс не налаштовано (LINGVA_BASE_URL порожній) — фолбек на
  //    безключовий Google GTX (v1), щоб переклад/prefetch працював без зовнішнього сервера.
  //    (Без цього translationServiceV2 повертав '' → prefetchAhead у ReaderScreen не працював.)
  if (!LINGVA_BASE) {
    try {
      const r = await gtxTranslateCached(text, from, to);
      if (r.text) return { text: r.text, detectedSourceLang: r.detectedSourceLang, source: 'lingva' };
    } catch {
      // fall through to offline dict
    }
  }

  // 1) Спроба Lingva (мережа)
  if (LINGVA_BASE) {
    try {
      const url = `${LINGVA_BASE}/${encodeURIComponent(from)}/${encodeURIComponent(to)}/${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data?.translation) {
          return { text: data.translation, detectedSourceLang: data?.info?.detected_source_language, source: 'lingva' };
        }
      }
    } catch {
      // fall through to offline
    }
  }

  // 2) Фолбек: офлайн-словник (точне слово)
  const dictLang = from === 'auto' ? to : from;
  if (isDictLoaded(dictLang)) {
    const entries = lookupWord(dictLang, text, 1);
    if (entries.length && entries[0].definition) {
      return { text: entries[0].definition, source: 'offline-dict' };
    }
  }

  // 3) Нічого не вийшло — не краш, повертаємо порожнечу
  return { text: '', source: 'none' };
}

/** Один фрагмент для пакетного перекладу. `id` — довільний ключ (індекс абзацу). */
export interface BatchTranslateItem {
  id: string | number;
  text: string;
}

/**
 * Пакетний переклад: переводимо одразу групу фрагментів паралельно (через translateCached,
 * з кешем LRU) і повертаємо Map id→результат. Використовується чанкером ReaderScreen
 * для префетчу перекладу «на 5 сторінок уперед», щоб не гальмувати скрол.
 */
export async function translateBatch(
  items: BatchTranslateItem[],
  from: LangCode,
  to: LangCode,
): Promise<Map<string | number, TranslateResult>> {
  const results = await Promise.all(
    items.map(async (it) => {
      try {
        const res = await translateCached(it.text, from, to);
        return [it.id, res] as [string | number, TranslateResult];
      } catch {
        return [it.id, { text: '', source: 'none' as const }] as [string | number, TranslateResult];
      }
    }),
  );
  return new Map<string | number, TranslateResult>(results);
}

/** Кэш LRU (як у v1) — не дергаємо мережу на кожен тап. */
const CACHE_LIMIT = 2000;
const cache = new Map<string, TranslateResult>();
export async function translateCached(text: string, from: LangCode, to: LangCode): Promise<TranslateResult> {
  const key = `${from}|${to}|${text}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const result = await translate(text, from, to);
  cache.set(key, result);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return result;
}
