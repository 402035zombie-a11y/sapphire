// services/translationProviders.ts
// FAILOVER-ЛАНЦЮГ БЕЗКОШТОВНИХ ПРОВАЙДЕРІВ ПЕРЕКЛАДУ з трекінгом лімітів.
//
// Архітектура (для наступного агента):
//  - Кожен провайдер = { id, label, translateFn, limits }.
//  - RateLimiter на кожному провайдері: ковзне вікно (requests/char за період).
//    При 429/403 провайдер падає у cooldown ДО відомого часу поновлення ліміту
//    (Google GTX/Lingva → добова вікно UTC; MyMemory → доба з моменту бану;
//     LibreTranslate → година). До того часу провайдер пропускається без мережевого дзвінка.
//  - Failover: йдемо по ланцюгу, повертаємо перший успішний результат + source.
//  - Якщо ВСІ вичерпані → кидаємо TranslationError('all-exhausted') з розкладом поновлень,
//    щоб UI міг показати модалку "коли знову можна перекладати".
//
// ЛІМІТИ (реалістичні орієнтири безкоштовного доступу):
//  - google-gtx (translate.googleapis.com client=gtx): без ключа, м'який ліміт ~5k char/запит,
//    за IP тримає десятки запитів/хв стабільно; жорсткіша квота спрацьовує як 429.
//  - lingva (свій інстанс / public): проксі до Google — ліміт фактично гугловий, але
//    публічні інстанси мають власні rate-limits (~30 req/хв).
//  - mymemory (api.mymemory.translated.net): БЕЗ КЛЮЧА ~1000 слів/добу на IP (5k з email),
//    500 char/запит. 429 при перевищенні.
//  - libretranslate (libretranslate.com): без ключа лімітований; з ключем 2000 char/запит.
//    Публічний інстанс часто вимагає ключ → тримаємо останнім.

import { TranslationError } from './translationService';

export type LangCode = string;

export interface ProviderResult {
  text: string;
  detectedSourceLang?: LangCode;
  provider: ProviderId;
}

export type ProviderId = 'google-gtx' | 'google-clients5' | 'lingva' | 'mymemory' | 'libretranslate';

interface ProviderLimitInfo {
  /** Період вікна ліміту, мс */
  windowMs: number;
  /** Макс запитів за вікно (орієнтир) */
  maxRequests: number;
  /** Макс символів за один запит */
  maxCharsPerRequest: number;
}

export interface ProviderState {
  id: ProviderId;
  label: string;
  /** ms epoch, коли провайдер знову доступний (0 = вже доступний) */
  cooldownUntil: number;
  /** причина cooldown */
  reason?: string;
  requestsThisWindow: number;
  windowStartedAt: number;
}

const HOUR_MS = 3600_000;
const DAY_MS = 24 * HOUR_MS;

const PROVIDERS: {
  id: ProviderId;
  label: string;
  limit: ProviderLimitInfo;
  fn: (text: string, from: LangCode, to: LangCode) => Promise<{ text: string; detected?: LangCode }>;
}[] = [
  {
    id: 'google-gtx',
    label: 'Google Translate',
    limit: { windowMs: HOUR_MS, maxRequests: 300, maxCharsPerRequest: 5000 },
    fn: async (text, from, to) => gtx(text, from, to),
  },
  {
    // Окремий endpoint Google Dictionary (Chrome extension): інша квота-відлунь,
    // ніж translate.googleapis.com → фактично другий незалежний Google-канал.
    id: 'google-clients5',
    label: 'Google Dictionary',
    limit: { windowMs: HOUR_MS, maxRequests: 300, maxCharsPerRequest: 5000 },
    fn: async (text, from, to) => gtxClients5(text, from, to),
  },
  {
    id: 'lingva',
    label: 'Lingva',
    limit: { windowMs: HOUR_MS, maxRequests: 120, maxCharsPerRequest: 4500 },
    fn: async (text, from, to) => lingva(text, from, to),
  },
  {
    id: 'mymemory',
    label: 'MyMemory',
    limit: { windowMs: DAY_MS, maxRequests: 400, maxCharsPerRequest: 500 },
    fn: async (text, from, to) => myMemory(text, from, to),
  },
  {
    id: 'libretranslate',
    label: 'LibreTranslate',
    limit: { windowMs: DAY_MS, maxRequests: 50, maxCharsPerRequest: 2000 },
    fn: async (text, from, to) => libre(text, from, to),
  },
];

const LINGVA_BASE = (process.env.EXPO_PUBLIC_LINGVA_BASE_URL ?? '').replace(/\/$/, '');
const LIBRE_BASE = 'https://libretranslate.com/translate';

// ---------- події для UI (сповіщення про переключення/відновлення) ----------

export type ProviderEvent =
  | { type: 'switched'; fromLabel: string; toLabel: string; resetAtMs: number }
  | { type: 'recovered'; label: string };

const listeners = new Set<(e: ProviderEvent) => void>();

/** Підписка на події перемикання/відновлення провайдерів (для тостів). */
export function onProviderEvent(fn: (e: ProviderEvent) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emit(e: ProviderEvent) {
  for (const fn of listeners) {
    try {
      fn(e);
    } catch {
      // UI-слухач не має валити переклад
    }
  }
}

// ---------- стан лімітів ----------
const state = new Map<ProviderId, ProviderState>();

function getState(id: ProviderId, limit: ProviderLimitInfo): ProviderState {
  let s = state.get(id);
  if (!s) {
    s = { id, label: '', cooldownUntil: 0, requestsThisWindow: 0, windowStartedAt: Date.now() };
    state.set(id, s);
  }
  // Вікно скинулось → провайдер автоматично знову доступний.
  // Одноразова подія 'recovered', щоб UI показав «ліміт поновлено».
  if (s.cooldownUntil > 0 && Date.now() >= s.cooldownUntil) {
    const p = PROVIDERS.find((x) => x.id === id);
    emit({ type: 'recovered', label: p?.label ?? id });
    s.cooldownUntil = 0;
    s.reason = undefined;
    s.requestsThisWindow = 0;
    s.windowStartedAt = Date.now();
  }
  if (Date.now() - s.windowStartedAt >= limit.windowMs) {
    s.requestsThisWindow = 0;
    s.windowStartedAt = Date.now();
  }
  return s;
}

function markRateLimited(id: ProviderId, limit: ProviderLimitInfo, reason: string) {
  const s = state.get(id);
  if (!s) return;
  // Час поновлення: кінець поточного вікна (для годинних — через годину; для доби — опівнічний цикл від першого запиту)
  s.cooldownUntil = Math.max(s.cooldownUntil, s.windowStartedAt + limit.windowMs);
  s.reason = reason;
}

function markSuccess(id: ProviderId) {
  const s = state.get(id);
  if (s) {
    s.requestsThisWindow += 1;
    s.cooldownUntil = 0;
    s.reason = undefined;
  }
}

/** Публічний знімок станів — для UI-модалки «ліміти». */
export function getProvidersStatus(): (ProviderState & { label: string })[] {
  return PROVIDERS.map((p) => {
    const s = getState(p.id, p.limit);
    return { ...s, label: p.label };
  });
}

/** Скільки хв до повного відновлення найближчого провайдера. */
export function minutesUntilRecovery(): number | null {
  const now = Date.now();
  const cds = [...state.values()].map((s) => s.cooldownUntil).filter((c) => c > now);
  if (!cds.length) return 0;
  return Math.ceil(Math.min(...cds) - now) / 60000;
}

// ---------- HTTP-провайдери ----------

async function fetchWithTimeout(url: string, init: any, timeoutMs = 10000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function gtx(text: string, from: LangCode, to: LangCode) {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${from}&tl=${to}&q=${encodeURIComponent(text)}`;
  const res = await fetchWithTimeout(url, {});
  if (res.status === 429 || res.status === 403) throw new TranslationError('rate-limit', `gtx ${res.status}`);
  if (!res.ok) throw new TranslationError('http', `gtx ${res.status}`, res.status);
  const data = await res.json();
  const out = Array.isArray(data?.[0])
    ? (data[0] as Array<[string]>).map((s) => (s && s[0] ? s[0] : '')).join('').trim()
    : '';
  if (!out) throw new TranslationError('empty', 'gtx empty');
  return { text: out, detected: (data[2] as LangCode) ?? undefined };
}

// Другий незалежний Google-канал: endpoint Chrome Dictionary extension.
// Відповідь: [["переклад","джерело-мова"]] або [["переклад"],...].
async function gtxClients5(text: string, from: LangCode, to: LangCode) {
  const url =
    `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${from}&tl=${to}&q=${encodeURIComponent(text)}`;
  const res = await fetchWithTimeout(url, {});
  if (res.status === 429 || res.status === 403) throw new TranslationError('rate-limit', `c5 ${res.status}`);
  if (!res.ok) throw new TranslationError('http', `c5 ${res.status}`, res.status);
  const data = await res.json();
  // Формат A: [["translated","src"]]; Формат B: [["seg1"],["seg2"]]
  let out = '';
  let detected: LangCode | undefined;
  if (Array.isArray(data)) {
    if (typeof data[0]?.[0] === 'string' && typeof data[0]?.[1] === 'string') {
      out = data[0][0];
      detected = data[0][1];
    } else if (Array.isArray(data[0])) {
      out = data.map((seg: any) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : '')).join('').trim();
    }
  }
  if (!out) throw new TranslationError('empty', 'c5 empty');
  return { text: out, detected };
}

async function lingva(text: string, from: LangCode, to: LangCode) {
  if (!LINGVA_BASE) throw new TranslationError('empty', 'lingva not configured');
  const src = from === 'auto' ? 'auto' : from;
  const url = `${LINGVA_BASE}/${encodeURIComponent(src)}/${encodeURIComponent(to)}/${encodeURIComponent(text)}`;
  const res = await fetchWithTimeout(url, {});
  if (res.status === 429 || res.status === 403) throw new TranslationError('rate-limit', `lingva ${res.status}`);
  if (!res.ok) throw new TranslationError('http', `lingva ${res.status}`, res.status);
  const data = await res.json();
  if (!data?.translation) throw new TranslationError('empty', 'lingva empty');
  return { text: String(data.translation), detected: data?.info?.detected_source_language };
}

async function myMemory(text: string, from: LangCode, to: LangCode) {
  // MyMemory: langpair=en|uk, text ≤500 chars. Без ключа ~1000 слів/добу/IP.
  const clipped = text.slice(0, 490);
  const pair = `${from === 'auto' ? 'en' : from}|${to}`;
  const url =
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clipped)}&langpair=${encodeURIComponent(pair)}`;
  const res = await fetchWithTimeout(url, {});
  if (res.status === 429 || res.status === 403) throw new TranslationError('rate-limit', `mm ${res.status}`);
  if (!res.ok) throw new TranslationError('http', `mm ${res.status}`, res.status);
  const data = await res.json();
  const t = data?.responseData?.translatedText;
  if (!t || /^MYMEMORY WARNING/i.test(t)) throw new TranslationError('rate-limit', 'mm quota');
  return { text: String(t) };
}

async function libre(text: string, from: LangCode, to: LangCode) {
  const body = JSON.stringify({
    q: text.slice(0, 1900),
    source: from === 'auto' ? 'auto' : from,
    target: to,
    format: 'text',
  });
  const res = await fetchWithTimeout(LIBRE_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (res.status === 429 || res.status === 403) throw new TranslationError('rate-limit', `lt ${res.status}`);
  if (!res.ok) throw new TranslationError('http', `lt ${res.status}`, res.status);
  const data = await res.json();
  if (!data?.translatedText) throw new TranslationError('empty', 'lt empty');
  return { text: String(data.translatedText) };
}

// ---------- Головний failover-виклик ----------

export interface FailoverOutcome {
  result: ProviderResult | null;
  error?: TranslationError;
}

export async function translateWithFailover(
  text: string,
  from: LangCode,
  to: LangCode,
): Promise<ProviderResult> {
  if (!text.trim()) throw new TranslationError('empty', 'empty input');

  const errors: string[] = [];
  let fromLabel = '';
  for (const p of PROVIDERS) {
    const s = getState(p.id, p.limit);

    // Провайдер у cooldown → пропускаємо БЕЗ мережі
    if (s.cooldownUntil > Date.now()) {
      errors.push(`${p.label}: cooling down till ${new Date(s.cooldownUntil).toLocaleTimeString()}`);
      continue;
    }
    // М'який локальний ліміт по вікну — не чекаємо 429, одразу далі
    if (s.requestsThisWindow >= p.limit.maxRequests) {
      markRateLimited(p.id, p.limit, 'local window limit');
      errors.push(`${p.label}: local window exhausted`);
      continue;
    }
    // Обрізаємо під maxChars провайдера (крім gtx — там 5k)
    const payload = text.slice(0, p.limit.maxCharsPerRequest - 10);

    try {
      const r = await p.fn(payload, from, to);
      // Сповіщення: якщо основний провайдер був у cooldown і ми дійшли сюди —
      // це фактичне переключення на резервний канал.
      if (fromLabel) {
        emit({ type: 'switched', fromLabel, toLabel: p.label, resetAtMs: Date.now() });
      }
      markSuccess(p.id);
      return { text: r.text, detectedSourceLang: r.detected, provider: p.id };
    } catch (e: any) {
      const kind = e instanceof TranslationError ? e.kind : 'network';
      if (kind === 'rate-limit' || kind === 'forbidden') {
        if (!fromLabel) fromLabel = p.label;
        markRateLimited(p.id, p.limit, e.message);
      }
      errors.push(`${p.label}: ${e.message}`);
      // йдемо до наступного
    }
  }

  // Всі провайдери недоступні
  const err = new TranslationError('rate-limit', `All providers exhausted: ${errors.join('; ')}`);
  (err as any).providers = getProvidersStatus();
  throw err;
}
