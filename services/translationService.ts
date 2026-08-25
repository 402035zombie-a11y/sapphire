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
  return viaGoogleGtx(text, from, to);
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
