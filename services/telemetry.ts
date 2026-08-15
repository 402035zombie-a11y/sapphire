/**
 * telemetry.ts — E11: краш-репортинг (Sentry).
 *
 * ЧОМУ ТАК (для наступного агента):
 *  - Sentry (open-source, безкоштовний tier) для крашів + performance. Альтернатива Firebase Crashlytics.
 *  - DSN тримаємо в .env (SENTRY_DSN); якщо порожній — no-op (не ламає dev/білд без аккаунта).
 *  - Ініціалізується в App.tsx initTelemetry(). Не блокує запуск, якщо Sentry не встановлений.
 */
let initialized = false;

export function initTelemetry(): void {
  if (initialized) return;
  initialized = true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    // No DSN — тихий no-op (offline-friendly, не падає).
    return;
  }
  try {
    // Ліниве імпортування: якщо пакет не встановлений — не крашимо.
    // npm i @sentry/react-native  (devDep, опціонально)
    const Sentry = require('@sentry/react-native');
    Sentry.init({ dsn, tracesSampleRate: 0.2 });
  } catch {
    // Sentry не встановлений — ігноруємо.
  }
}

export function captureError(e: unknown, context?: Record<string, unknown>): void {
  try {
    const Sentry = require('@sentry/react-native');
    Sentry.captureException(e, context ? { extra: context } : undefined);
  } catch {
    // no-op
  }
}
