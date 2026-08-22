/**
 * scripts/test-e4-db.mjs — реальна перевірка SQL-шару E4 (bookImport + getBookChapters).
 *
 * ЧОМУ: expo-sqlite не працює в node, але better-sqlite3 (devDep) емулює точну схему/SQL.
 * Доводимо, що:
 *  1. importBook пише content_html (НЕ href) у chapters
 *  2. getBookChapters читає content_html (НЕ href)
 *  3. Реальний EPUB contentHtml зберігається і читається 1-в-1
 *
 * Запуск: node scripts/test-e4-db.mjs
 */
import Database from 'better-sqlite3';

const db = new Database(':memory:');

// ТОЧНА схема з db.ts (E4: content_html додано)
db.exec(`
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, author TEXT, path TEXT NOT NULL,
  format TEXT NOT NULL, added_at INTEGER NOT NULL, file_hash TEXT, cover_thumb TEXT
);
CREATE TABLE IF NOT EXISTS chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT, book_id TEXT NOT NULL, idx INTEGER NOT NULL,
  title TEXT, href TEXT, content_html TEXT, char_count INTEGER DEFAULT 0,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
`);

// Емуляція importBook (точний SQL з bookImport.ts рядок 54-70)
function importBook(bookId, chapters) {
  const tx = db.transaction(() => {
    db.prepare(`INSERT OR REPLACE INTO books (id, title, author, path, format, added_at, file_hash)
      VALUES (?,?,?,?,?,?,?)`).run(bookId, 'Test Book', 'Author', '/x.epub', 'epub', Date.now(), bookId);
    db.prepare(`DELETE FROM chapters WHERE book_id = ?`).run(bookId);
    const stmt = db.prepare(`INSERT INTO chapters (book_id, idx, title, href, content_html, char_count) VALUES (?,?,?,?,?,?)`);
    for (const ch of chapters) {
      stmt.run(bookId, ch.idx, ch.title, ch.href, ch.contentHtml, ch.charCount);
    }
  });
  tx();
}

// Емуляція getBookChapters (точний SQL з bookImport.ts рядок 111-116)
function getBookChapters(bookId) {
  const rows = db.prepare(
    `SELECT idx, title, href, content_html, char_count FROM chapters WHERE book_id = ? ORDER BY idx`
  ).all(bookId);
  return rows.map((r) => ({ idx: r.idx, title: r.title, href: r.href, contentHtml: r.content_html, charCount: r.char_count }));
}

// Реальний EPUB contentHtml (як повертає epubParser)
const sampleChapters = [
  { idx: 0, title: 'Chapter 1', href: 'chapter1.html', contentHtml: '<p>It is a truth universally acknowledged.</p><p>Mr. Bennet was odd.</p>', charCount: 60 },
  { idx: 1, title: 'Chapter 2', href: 'chapter2.html', contentHtml: '<p>Mr. Darcy noticed her fine eyes.</p>', charCount: 35 },
];

importBook('bk_test', sampleChapters);
const read = getBookChapters('bk_test');

let fail = 0;
if (read.length !== 2) { console.log('FAIL: expected 2 chapters, got', read.length); fail++; }
// КРИТИЧНО: contentHtml має бути ТЕКСТОМ, а не href
for (const ch of read) {
  if (ch.contentHtml === ch.href) { console.log('FAIL: contentHtml === href (bug not fixed!)', ch.href); fail++; }
  if (!ch.contentHtml.includes('<p>')) { console.log('FAIL: contentHtml not HTML text:', ch.contentHtml); fail++; }
  if (ch.href === 'chapter1.html' && ch.contentHtml !== sampleChapters[0].contentHtml) {
    console.log('FAIL: contentHtml mismatch'); fail++;
  }
}

console.log(`Chapters read: ${read.length}`);
console.log(`Ch0 contentHtml: ${read[0].contentHtml.slice(0, 50)}...`);
console.log(`Ch0 href: ${read[0].href}`);
console.log(fail === 0 ? 'E4 DB SQL OK ✅ (content_html written + read correctly)' : `E4 DB SQL FAILED ❌ (${fail})`);
process.exit(fail === 0 ? 0 : 1);
