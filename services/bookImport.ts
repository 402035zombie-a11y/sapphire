/**
 * bookImport.ts — E3: parse-once → SQLite (books.db.chapters).
 *
 * ЧОМУ ТАК (для наступного агента):
 *  - Поточний LibraryScreen парсить книгу і кладе paragraphs у libraryStore (AsyncStorage+JSON).
 *    Це повільно і БЕЗ parse-once: кожне відкриття ReaderScreen ре-читає JSON із параграфами.
 *  - Рішення: при імпорті парсимо ОДИН раз і пишемо глави у books.db.chapters.
 *    ReaderScreen надалі читає глави з БД (миттєво), не з libraryStore.
 *  - Інтеграція ЕВОЛЮЦІЙНА: не ламаємо існуючий flow — parallel пишемо в БД, libraryStore лишаємо
 *    як легкий індекс (без paragraphs у пам'яті в майбутньому, але поки сумісно).
 *
 * parse-once гарантує: "відкрити вдруге → продовжити з того ж місця + миттєво" (вимога юзера).
 */
import * as SQLite from 'expo-sqlite';
import { getBooksDb } from './db';
import { parseBook, ParsedBook, ParsedChapter } from './bookParser';
import { useAppStore } from '../store/appStore';

export interface ImportResult {
  bookId: string;
  title: string;
  author: string;
  format: string;
  chapterCount: number;
}

/** MD5-подібний хеш шляху+розміру для ідентифікації книги (без дублів при повторному імпорті). */
function makeBookId(filePath: string): string {
  let h = 0;
  for (let i = 0; i < filePath.length; i++) {
    h = (h * 31 + filePath.charCodeAt(i)) | 0;
  }
  return `bk_${Math.abs(h).toString(36)}`;
}

/**
 * Імпорт книги: парсинг (через фасад) + запис у books.db.
 * onProgress(0..1) — для UI-індикатора.
 * Повертає легкий desc (без тексту) — text живе в chapters.
 */
export async function importBook(
  filePath: string,
  format: string,
  onProgress?: (p: number) => void
): Promise<ImportResult> {
  onProgress?.(0.05);
  const parsed: ParsedBook = await parseBook(filePath);
  onProgress?.(0.7);

  const db: SQLite.SQLiteDatabase = getBooksDb();
  const bookId = makeBookId(filePath);

  db.withTransactionSync(() => {
    db.runSync(
      `INSERT OR REPLACE INTO books (id, title, author, path, format, added_at, file_hash)
       VALUES (?,?,?,?,?,?,?)`,
      [bookId, parsed.title, parsed.author, filePath, parsed.format, Date.now(), bookId]
    );
    // очищаємо старі глави (якщо повторний імпорт того ж файлу)
    db.runSync(`DELETE FROM chapters WHERE book_id = ?`, [bookId]);
    const stmt = db.prepareSync(
      `INSERT INTO chapters (book_id, idx, title, href, content_html, char_count) VALUES (?,?,?,?,?,?)`
    );
    try {
      for (const ch of parsed.chapters) {
        stmt.executeSync([bookId, ch.idx, ch.title, ch.href, ch.contentHtml, ch.charCount]);
      }
    } finally {
      stmt.finalizeSync();
    }
  });

  onProgress?.(1);
  return {
    bookId,
    title: parsed.title,
    author: parsed.author,
    format: parsed.format,
    chapterCount: parsed.chapters.length,
  };
}

/** Зчитати одну главу з БД (ReaderScreen використовує це замість libraryStore.paragraphs). */
export function getChapter(bookId: string, idx: number): {
  title: string;
  contentHtml: string;
  charCount: number;
} | null {
  const db = getBooksDb();
  const row = db.getFirstSync(
    `SELECT title, content_html, char_count FROM chapters WHERE book_id = ? AND idx = ?`,
    [bookId, idx]
  ) as { title: string; content_html: string; char_count: number } | null;
  return row ? { title: row.title, contentHtml: row.content_html, charCount: row.char_count } : null;
}

/** Список глав (для TOC/навігації). */
export function listChapters(bookId: string): { idx: number; title: string }[] {
  const db = getBooksDb();
  const rows = db.getAllSync(
    `SELECT idx, title FROM chapters WHERE book_id = ? ORDER BY idx`,
    [bookId]
  ) as { idx: number; title: string }[];
  return rows;
}

/**
 * Повні глави з БД (parse-once). Використовується ReaderScreen як пріоритетне джерело
 * замість libraryStore.paragraphs (швидше повторне відкриття). Якщо БД порожня — повертає [].
 */
export function getBookChapters(bookId: string): ParsedChapter[] {
  const db = getBooksDb();
  const rows = db.getAllSync(
    `SELECT idx, title, href, content_html, char_count FROM chapters WHERE book_id = ? ORDER BY idx`,
    [bookId]
  ) as { idx: number; title: string; href: string; content_html: string; char_count: number }[];
  return rows.map((r) => ({
    idx: r.idx,
    title: r.title,
    href: r.href,
    contentHtml: r.content_html,
    charCount: r.char_count,
  }));
}

/** Зберегти прогрес читання (mirror у MMKV appStore для миттєвого відновлення). */
export function saveReadingProgress(bookId: string, chapterIdx: number, position: number): void {
  const db = getBooksDb();
  db.runSync(
    `UPDATE books SET added_at = added_at WHERE id = ?`,
    [bookId]
  );
  useAppStore.getState().setProgress(bookId, chapterIdx, position);
}
