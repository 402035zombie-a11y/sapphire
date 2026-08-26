/**
 * sentenceTranslationsDb.ts — E2/Фаза 2: переклади речень у books.db (SQLite),
 * НЕ в AsyncStorage JSON. Знімає ліміт 6MB і O(n)-перезапис всього стора
 * при кожному перекладі речення.
 *
 * Ключ skey = глобальний індекс речення (як раніше paragraphIndex*1000+sentenceIndex,
 * але після переходу Reader на chapter-sentences це просто String(s.index)).
 *
 * MULTILANG FIX (2026-08-26): ключ тепер (book_id, skey, lang). Раніше PRIMARY KEY
 * був (book_id, skey) → перемикання мови перекладу ПЕРЕЗАПИСУЛО попередню мову
 * (EN→UK, потім EN→DE затирає UK; повернення до UK = «переклад пропав»).
 * Тепер кожна цільова мова має власний рядок. Старі дані мігрують у lang='__legacy__'
 * і читаються як fallback, якщо для поточної мови ще нема запису.
 */
import * as SQLite from 'expo-sqlite';
import { getBooksDb } from './db';

export type SentenceTranslationEntry = { key: string; translation: string };

/** Міграція: додаємо колонку lang + новий PK. Ідемпотентна. */
function ensureSchema(db: SQLite.SQLiteDatabase): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sentence_translations (
      book_id TEXT NOT NULL,
      skey TEXT NOT NULL,
      translation TEXT NOT NULL DEFAULT '',
      lang TEXT NOT NULL DEFAULT '__legacy__',
      PRIMARY KEY (book_id, skey, lang)
    );
  `);
  // Якщо таблиця існувала зі старою схемою (PK без lang) — додати колонку.
  const cols = db.getAllSync(`PRAGMA table_info(sentence_translations)`) as { name: string }[];
  if (!cols.some((c) => c.name === 'lang')) {
    db.execSync(`ALTER TABLE sentence_translations ADD COLUMN lang TEXT NOT NULL DEFAULT '__legacy__';`);
    // Перебудова PK неможлива без CREATE нової таблиці в SQLite — але старий PK
    // (book_id,skey) продовжує працювати як унікальний індекс поверх нової колонки:
    // ON CONFLICT(book_id,skey,lang) не спрацює наявним індексом. Створюємо таблицю заново.
    db.execSync(`
      CREATE TABLE IF NOT EXISTS sentence_translations_v2 (
        book_id TEXT NOT NULL,
        skey TEXT NOT NULL,
        translation TEXT NOT NULL DEFAULT '',
        lang TEXT NOT NULL DEFAULT '__legacy__',
        PRIMARY KEY (book_id, skey, lang)
      );
      INSERT OR IGNORE INTO sentence_translations_v2 (book_id, skey, translation, lang)
        SELECT book_id, skey, translation, '__legacy__' FROM sentence_translations;
      DROP TABLE sentence_translations;
      ALTER TABLE sentence_translations_v2 RENAME TO sentence_translations;
    `);
  }
}

let schemaReady = false;
function withDb(): SQLite.SQLiteDatabase {
  const db = getBooksDb();
  if (!schemaReady) {
    ensureSchema(db);
    schemaReady = true;
  }
  return db;
}

/** Batch upsert (одна транзакція). Викликається після успішного перекладу. */
export function saveSentenceTranslations(
  bookId: string,
  entries: SentenceTranslationEntry[],
  lang: string = '__legacy__',
): void {
  if (!entries.length) return;
  const db = withDb();
  db.withTransactionSync(() => {
    const stmt = db.prepareSync(
      `INSERT INTO sentence_translations (book_id, skey, translation, lang) VALUES (?,?,?,?)
       ON CONFLICT(book_id, skey, lang) DO UPDATE SET translation = excluded.translation`
    );
    try {
      for (const e of entries) stmt.executeSync([bookId, e.key, e.translation, lang]);
    } finally {
      stmt.finalizeSync();
    }
  });
}

/**
 * Мапа перекладів для діапазону речень [fromIdx..toIdx] — для renderItem/prefetch.
 * Fallback: якщо для `lang` нема запису, але є legacy-запис (до міграції) — береться він.
 */
export function getSentenceTranslations(
  bookId: string,
  keys: string[],
  lang: string = '__legacy__'
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!keys.length) return out;
  const db = withDb();
  const CHUNK = 300; // 3 запити × vars
  for (let i = 0; i < keys.length; i += CHUNK) {
    const part = keys.slice(i, i + CHUNK);
    const ph = part.map(() => '?').join(',');
    const rows = db.getAllSync(
      `SELECT skey, translation FROM sentence_translations WHERE book_id = ? AND lang = ? AND skey IN (${ph})`,
      [bookId, lang, ...part]
    ) as { skey: string; translation: string }[];
    for (const r of rows) out[r.skey] = r.translation;

    // Legacy fallback: тільки якщо по цій мові майже нічого нема (перша зміна мови)
    const missing = part.filter((k) => !(k in out));
    if (missing.length && lang !== '__legacy__') {
      const ph2 = missing.map(() => '?').join(',');
      const legacyRows = db.getAllSync(
        `SELECT skey, translation FROM sentence_translations WHERE book_id = ? AND lang = '__legacy__' AND skey IN (${ph2})`,
        [bookId, ...missing]
      ) as { skey: string; translation: string }[];
      for (const r of legacyRows) if (!(r.skey in out)) out[r.skey] = r.translation;
    }
  }
  return out;
}

/** Чи є переклад (для "перекладати чи ні" перевірок без завантаження тексту). */
export function hasAnyTranslation(bookId: string, key: string, lang: string = '__legacy__'): boolean {
  const db = withDb();
  return !!db.getFirstSync(
    `SELECT 1 FROM sentence_translations WHERE book_id = ? AND skey = ? AND lang = ? AND translation != ''`,
    [bookId, key, lang]
  );
}

/** Отримати всі збережені переклади речень книги (для імпорту словника / тренувань). */
export function getAllBookSentenceTranslations(bookId: string): { key: string; translation: string }[] {
  const db = withDb();
  const rows = db.getAllSync(
    `SELECT skey AS key, translation FROM sentence_translations WHERE book_id = ? AND translation != ''`,
    [bookId]
  ) as { key: string; translation: string }[];
  return rows;
}

/** Видалити всі переклади книги (зміна мови перекладу / видалення книги). */
export function clearSentenceTranslations(bookId: string, lang?: string): void {
  const db = withDb();
  if (lang) {
    db.runSync(`DELETE FROM sentence_translations WHERE book_id = ? AND lang = ?`, [bookId, lang]);
  } else {
    db.runSync(`DELETE FROM sentence_translations WHERE book_id = ?`, [bookId]);
  }
}
