/**
 * dictDb.ts — словник у books.db (SQLite), замість AsyncStorage JSON.
 *
 * ЧОМУ: JSON-стор упирався в ліміт CursorWindow (~2MB/рядок) і перезаписував
 * весь масив при кожній зміні. Тут — точкові INSERT/UPDATE + індекс word|lang.
 *
 * Стратегія рендеру: DictionaryScreen читає ПОВНИЙ список через getAllEntries()
 * один раз на екрані (швидко: ~200k рядків < 300ms з індексом), фільтри/сорт — локально.
 */
import * as SQLite from 'expo-sqlite';
import { getBooksDb } from './db';

export interface DictRow {
  id: number;
  word: string;
  lang: string;
  surfaceForm: string;
  translation: string;
  context: string;
  bookId?: string;
  frequency: number;
  createdAt: number;
}

interface RowRaw {
  id: number;
  word: string;
  lang: string;
  surface_form: string | null;
  translation: string | null;
  context: string | null;
  book_id: string | null;
  frequency: number | null;
  created_at: number;
}

const toRow = (r: RowRaw): DictRow => ({
  id: r.id,
  word: r.word,
  lang: r.lang,
  surfaceForm: r.surface_form ?? r.word,
  translation: r.translation ?? '',
  context: r.context ?? '',
  bookId: r.book_id ?? undefined,
  frequency: r.frequency ?? 1,
  createdAt: r.created_at,
});

export function getAllEntries(): DictRow[] {
  const db = getBooksDb();
  return (db.getAllSync(`SELECT * FROM dict_entries ORDER BY created_at DESC`) as RowRaw[]).map(toRow);
}

export function getRandomTranslations(excludeWord: string, excludeLang: string, limit = 20): string[] {
  const db = getBooksDb();
  const w = excludeWord.trim().toLowerCase();
  const rows = db.getAllSync(
    `SELECT translation FROM dict_entries 
     WHERE (word != ? OR lang != ?) AND translation IS NOT NULL AND translation != '' 
     ORDER BY RANDOM() LIMIT ?`,
    [w, excludeLang, limit]
  ) as { translation: string }[];
  return rows.map((r) => r.translation).filter(Boolean);
}

export function getRandomWords(excludeWord: string, excludeLang: string, limit = 20): string[] {
  const db = getBooksDb();
  const w = excludeWord.trim().toLowerCase();
  const rows = db.getAllSync(
    `SELECT COALESCE(surface_form, word) AS word FROM dict_entries 
     WHERE (word != ? OR lang != ?) 
     ORDER BY RANDOM() LIMIT ?`,
    [w, excludeLang, limit]
  ) as { word: string }[];
  return rows.map((r) => r.word).filter(Boolean);
}

/** O(1)-перевірка існування (замість .some() по всьому масиву). */
export function hasEntry(word: string, lang?: string): boolean {
  const w = word.trim().toLowerCase();
  const db = getBooksDb();
  if (lang != null) {
    return !!db.getFirstSync(
      `SELECT 1 FROM dict_entries WHERE word = ? AND lang = ? LIMIT 1`,
      [w, lang]
    );
  }
  return !!db.getFirstSync(`SELECT 1 FROM dict_entries WHERE word = ? LIMIT 1`, [w]);
}

/** Додати слово; якщо word|lang існує — інкремент частоти. Повертає id. */
export function insertEntry(e: {
  word: string;
  lang: string;
  surfaceForm?: string;
  translation?: string;
  context?: string;
  bookId?: string;
  frequency?: number;
}): { id: number; merged: boolean } {
  const db = getBooksDb();
  const w = e.word.trim().toLowerCase();
  const now = Date.now();
  const existing = db.getFirstSync(
    `SELECT id, frequency FROM dict_entries WHERE word = ? AND lang = ?`,
    [w, e.lang]
  ) as { id: number; frequency: number } | null;
  if (existing) {
    const inc = Math.max(1, e.frequency ?? 1);
    db.runSync(`UPDATE dict_entries SET frequency = frequency + ? WHERE id = ?`, [inc, existing.id]);
    return { id: existing.id, merged: true };
  }
  db.runSync(
    `INSERT INTO dict_entries (word, lang, surface_form, translation, context, book_id, frequency, created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [w, e.lang, e.surfaceForm ?? e.word, e.translation ?? '', e.context ?? '', e.bookId ?? null, e.frequency ?? 1, now]
  );
  const row = db.getFirstSync(`SELECT last_insert_rowid() AS id`) as { id: number };
  return { id: row.id, merged: false };
}

/** Масовий імпорт однією транзакцією (200к слів ≈ кілька секунд). */
export function importEntriesBatch(
  list: {
    word: string;
    lang: string;
    surfaceForm?: string;
    translation?: string;
    context?: string;
    bookId?: string;
    frequency?: number;
  }[]
): number {
  if (!list.length) return 0;
  const db = getBooksDb();
  let added = 0;
  db.withTransactionSync(() => {
    for (const e of list) {
      const r = insertEntry(e);
      if (!r.merged) added++;
    }
  });
  return added;
}

export function updateTranslation(id: number, patch: { translation?: string; context?: string }): void {
  const db = getBooksDb();
  if (patch.translation != null) db.runSync(`UPDATE dict_entries SET translation = ? WHERE id = ?`, [patch.translation, id]);
  if (patch.context != null) db.runSync(`UPDATE dict_entries SET context = ? WHERE id = ?`, [patch.context, id]);
}

export function deleteEntry(id: number): void {
  getBooksDb().runSync(`DELETE FROM dict_entries WHERE id = ?`, [id]);
}

export function clearByBook(bookId: string): void {
  getBooksDb().runSync(`DELETE FROM dict_entries WHERE book_id = ?`, [bookId]);
}

export function clearAll(): void {
  getBooksDb().runSync(`DELETE FROM dict_entries`);
}

export function countEntries(): number {
  return (getBooksDb().getFirstSync(`SELECT COUNT(*) AS n FROM dict_entries`) as { n: number }).n;
}
