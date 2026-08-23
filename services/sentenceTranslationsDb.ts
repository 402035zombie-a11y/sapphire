/**
 * sentenceTranslationsDb.ts — E2/Фаза 2: переклади речень у books.db (SQLite),
 * НЕ в AsyncStorage JSON. Знімає ліміт 6MB і O(n)-перезапис всього стора
 * при кожному перекладі речення.
 *
 * Ключ skey = глобальний індекс речення (як раніше paragraphIndex*1000+sentenceIndex,
 * але після переходу Reader на chapter-sentences це просто String(s.index)).
 */
import * as SQLite from 'expo-sqlite';
import { getBooksDb } from './db';

export type SentenceTranslationEntry = { key: string; translation: string };

/** Batch upsert (одна транзакція). Викликається після успішного перекладу. */
export function saveSentenceTranslations(bookId: string, entries: SentenceTranslationEntry[]): void {
  if (!entries.length) return;
  const db: SQLite.SQLiteDatabase = getBooksDb();
  db.withTransactionSync(() => {
    const stmt = db.prepareSync(
      `INSERT INTO sentence_translations (book_id, skey, translation) VALUES (?,?,?)
       ON CONFLICT(book_id, skey) DO UPDATE SET translation = excluded.translation`
    );
    try {
      for (const e of entries) stmt.executeSync([bookId, e.key, e.translation]);
    } finally {
      stmt.finalizeSync();
    }
  });
}

/** Мапа перекладів для діапазону речень [fromIdx..toIdx] — для renderItem/prefetch. */
export function getSentenceTranslations(
  bookId: string,
  keys: string[]
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!keys.length) return out;
  const db: SQLite.SQLiteDatabase = getBooksDb();
  const CHUNK = 400; // SQLite limit vars ~999
  for (let i = 0; i < keys.length; i += CHUNK) {
    const part = keys.slice(i, i + CHUNK);
    const ph = part.map(() => '?').join(',');
    const rows = db.getAllSync(
      `SELECT skey, translation FROM sentence_translations WHERE book_id = ? AND skey IN (${ph})`,
      [bookId, ...part]
    ) as { skey: string; translation: string }[];
    for (const r of rows) out[r.skey] = r.translation;
  }
  return out;
}

/** Чи є переклад (для "перекладати чи ні" перевірок без завантаження тексту). */
export function hasAnyTranslation(bookId: string, key: string): boolean {
  const db: SQLite.SQLiteDatabase = getBooksDb();
  return !!db.getFirstSync(
    `SELECT 1 FROM sentence_translations WHERE book_id = ? AND skey = ? AND translation != ''`,
    [bookId, key]
  );
}

/** Видалити всі переклади книги (зміна мови перекладу / видалення книги). */
export function clearSentenceTranslations(bookId: string): void {
  getBooksDb().runSync(`DELETE FROM sentence_translations WHERE book_id = ?`, [bookId]);
}
