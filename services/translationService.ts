// services/translationService.ts
// Безкоштовний Google GTX translation layer із явними помилками: rate-limit, timeout, empty response.

export type LangCode = string;

export type TranslationErrorKind = 'rate-limit' | 'forbidden' | 'timeout' | 'http' | 'empty' | 'network' | 'parse';

export class TranslationError extends Error {
  kind: TranslationErrorKind;
  status?: number;

  constructor(kind: TranslationErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'TranslationError';
    this.kind = kind;
    this.status = status;
  }
}

export interface TranslateResult {
  text: string;
  detectedSourceLang?: LangCode;
}

const TRANSLATE_TIMEOUT_MS = 12000;

function errorKindFromStatus(status: number): TranslationErrorKind {
  if (status === 429) return 'rate-limit';
  if (status === 403) return 'forbidden';
  return 'http';
}

export function translationErrorMessage(error: unknown): string {
  if (error instanceof TranslationError) {
    if (error.kind === 'rate-limit') return 'Translation limit reached. Try later.';
    if (error.kind === 'forbidden') return 'Translation service blocked this request. Try later.';
    if (error.kind === 'timeout') return 'Translation timed out. Check connection and retry.';
    if (error.kind === 'empty') return 'Translation returned empty result. Retry.';
    return `Translation failed${error.status ? ` (${error.status})` : ''}.`;
  }
  return 'Translation failed. Check connection and retry.';
}

async function viaGoogleGtx(text: string, from: LangCode, to: LangCode): Promise<TranslateResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS);
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${from}&tl=${to}&q=${encodeURIComponent(text)}`;

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new TranslationError(errorKindFromStatus(res.status), `Google GTX translation failed: ${res.status}`, res.status);
    }

    let data: any;
    try {
      data = await res.json();
    } catch (e) {
      throw new TranslationError('parse', 'Could not parse translation response');
    }

    const translated = Array.isArray(data?.[0])
      ? (data[0] as Array<[string]>).map((seg) => (seg && seg[0] ? seg[0] : '')).join('').trim()
      : '';

    if (!translated) {
      throw new TranslationError('empty', 'Translation response was empty');
    }

    const detected = (data[2] as LangCode) ?? undefined;
    return { text: translated, detectedSourceLang: detected };
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new TranslationError('timeout', 'Translation request timed out');
    }
    if (e instanceof TranslationError) throw e;
    throw new TranslationError('network', e?.message || 'Translation network failure');
  } finally {
    clearTimeout(timer);
  }
}

export async function translate(text: string, from: LangCode, to: LangCode): Promise<TranslateResult> {
  if (!text.trim()) return { text: '' };
  // FAILOVER: ланцюг безкоштовних провайдерів з трекінгом лімітів (google → lingva → mymemory → libre).
  const { translateWithFailover } = await import('./translationProviders');
  const r = await translateWithFailover(text, from, to);
  return { text: r.text, detectedSourceLang: r.detectedSourceLang };
}

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

/**
 * БАТЧИНГ: перекладає групу текстів ОДНИМ запитом (склеює через `\n`),
 * замість окремого HTTP-запиту на кожне речення. Без цього prefetch робить
 * сотні запитів і безкоштовний Google GTX банить по кількості запитів
 * за кілька сторінок (юзер 2026-08-30: «ліміт за кілька сторінок, а не 13 романів»).
 *
 * Групуємо в батчі по ~4000 char (безпечно для Google GTX/clients5 5000 та Lingva 4500).
 * Якщо кількість рядків відповіді не співпала з кількістю речень → fallback
 * по-реченнєво (надійність понад швидкістю).
 */
const BATCH_MAX_CHARS = 4000;

export async function translateMany(
  texts: string[],
  from: LangCode,
  to: LangCode,
): Promise<string[]> {
  if (texts.length === 0) return [];
  if (texts.length === 1) {
    const r = await translateCached(texts[0], from, to);
    return [r.text];
  }

  // Групуємо в батчі по BATCH_MAX_CHARS
  const batches: string[][] = [];
  let cur: string[] = [];
  let curLen = 0;
  for (const t of texts) {
    if (curLen + t.length + 1 > BATCH_MAX_CHARS && cur.length > 0) {
      batches.push(cur);
      cur = [];
      curLen = 0;
    }
    cur.push(t);
    curLen += t.length + 1;
  }
  if (cur.length) batches.push(cur);

  const SEP = '\n';
  const out: string[] = [];
  for (const batch of batches) {
    if (batch.length === 1) {
      const r = await translateCached(batch[0], from, to);
      out.push(r.text);
      continue;
    }
    const joined = batch.join(SEP);
    try {
      const r = await translateCached(joined, from, to);
      const parts = r.text.split(SEP).map((s) => s.trim());
      if (parts.length === batch.length) {
        out.push(...parts);
        continue;
      }
      // рядки не співпали → fallback по-реченнєво
      for (const t of batch) {
        const rr = await translateCached(t, from, to);
        out.push(rr.text);
      }
    } catch {
      // помилка батча → fallback по-реченнєво (кожне речення окремо)
      for (const t of batch) {
        try {
          const rr = await translateCached(t, from, to);
          out.push(rr.text);
        } catch {
          out.push('');
        }
      }
    }
  }
  return out;
}
