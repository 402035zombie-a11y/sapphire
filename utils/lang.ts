// utils/lang.ts
// Централизованное разрешение языка 'auto' → 'en' для free-API (Free Dictionary,
// Google GTX в backfill-режимах). Google сам принимает 'auto' напрямую — для него
// НЕ используйте effectiveLang (см. ReaderScreen перевод батчами: auto→auto).
export const effectiveLang = (lang: string | undefined): string =>
  (lang && lang !== 'auto' ? lang : 'en');
