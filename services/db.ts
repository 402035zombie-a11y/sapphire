/**
 * db.ts — SQLite-фундамент (E2: Storage layer).
 * Заміна AsyncStorage+JSON. Дві БД:
 *  - books.db   : дані користувача (бібліотека, глави, закладки, виділення, картки слів)
 *  - dict_<lang>.db : офлайн-словник per-мова (on-demand, read-only)
 * Міграції через PRAGMA user_version (як Room Migration — не губимо БД при оновленні).
 *
 * API: expo-sqlite 57 (openDatabaseSync + execSync/prepareSync). FTS5 увімкнено у expo-sqlite.
 */
import * as SQLite from 'expo-sqlite';

export const BOOKS_DB_NAME = 'books.db';

export const BOOKS_SCHEMA_V1 = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  path TEXT NOT NULL,
  format TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  file_hash TEXT,
  cover_thumb TEXT
);
CREATE TABLE IF NOT EXISTS chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  title TEXT,
  href TEXT,
  content_html TEXT,
  char_count INTEGER DEFAULT 0,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters(book_id, idx);
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id TEXT NOT NULL,
  chapter_idx INTEGER,
  position REAL,
  note TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS highlights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id TEXT NOT NULL,
  chapter_idx INTEGER,
  start INTEGER,
  end INTEGER,
  text TEXT,
  color TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS word_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL,
  lang_from TEXT NOT NULL,
  lang_to TEXT NOT NULL,
  definition TEXT,
  example TEXT,
  box_level INTEGER DEFAULT 1,
  due_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_word_cards_due ON word_cards(due_at);
CREATE VIRTUAL TABLE IF NOT EXISTS books_fts USING fts5(title, author, content='books', content_rowid='id');
CREATE TABLE IF NOT EXISTS sentence_translations (
  book_id TEXT NOT NULL,
  skey TEXT NOT NULL,
  translation TEXT NOT NULL,
  PRIMARY KEY (book_id, skey)
);
`;

const DB_VERSION = 3;

let booksDb: SQLite.SQLiteDatabase | null = null;

export function getBooksDb(): SQLite.SQLiteDatabase {
  if (booksDb) return booksDb;
  const db = SQLite.openDatabaseSync(BOOKS_DB_NAME);
  db.execSync('PRAGMA foreign_keys = ON;');
  const ver = (db.getFirstSync('PRAGMA user_version') as { user_version: number }).user_version;
  if (ver < DB_VERSION) {
    db.execSync(BOOKS_SCHEMA_V1);
    // Міграція v1→v2: додати content_html у chapters (для parse-once Reader)
    if (ver < 2) {
      try {
        db.execSync('ALTER TABLE chapters ADD COLUMN content_html TEXT;');
      } catch {
        // колонка вже є (свіжа БД з V2 схемою)
      }
    }
    if (ver < 3) {
      db.execSync(`CREATE TABLE IF NOT EXISTS sentence_translations (
        book_id TEXT NOT NULL,
        skey TEXT NOT NULL,
        translation TEXT NOT NULL,
        PRIMARY KEY (book_id, skey)
      );`);
    }
    db.execSync(`PRAGMA user_version = ${DB_VERSION};`);
  }
  booksDb = db;
  return db;
}

/**
 * Відкрити/створити словник per-мова (read-only, on-demand).
 * dictFilePath — шлях до завантаженого .db (з kaikki.org). Якщо null — :memory: заглушка.
 * (Експорт/імпорт словника доводиться в E5.)
 */
export function openDictDb(lang: string, dictFilePath: string | null): SQLite.SQLiteDatabase {
  const name = dictFilePath ?? `dict_${lang}.db`;
  const db = SQLite.openDatabaseSync(name);
  return db;
}

export function closeBooksDb(): void {
  booksDb?.closeSync();
  booksDb = null;
}
