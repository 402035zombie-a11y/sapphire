/**
 * scripts/test-e4.mjs — верифікація E4 логіки (parse-once → paragraphs).
 *
 * ЧОМУ: expo-sqlite не працює в node, браузер-автоматизація заблокована (Firefox + Chrome-popap).
 * Тому емулюємо хук `chapters` з ReaderScreen на реальному contentHtml і перевіряємо,
 * що конвертація дає коректні BookParagraph[] (не href/посилання).
 *
 * Запуск: node scripts/test-e4.mjs
 */
import { readFileSync, existsSync } from 'fs';

// Реальний contentHtml (EPUB глава) — беремо з тестового EPUB якщо є, інакше емуляція.
function getSampleChapters() {
  // Спроба прочитати реальний EPUB з data/ якщо є
  const epubPath = process.argv[2];
  if (epubPath && existsSync(epubPath)) {
    // Простий regex: знайти перший <html> блок у .epub (zip) не розпаковуємо —
    // використовуємо bookParser через dynamic import якщо можливо.
    console.log('EPUB path given but zip-extract not implemented in this test; using sample.');
  }
  // Емуляція contentHtml (як пише epubParser у books.db)
  return [
    {
      idx: 0,
      title: 'Chapter 1',
      href: 'chapter1.html',
      contentHtml:
        '<p>It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.</p>' +
        '<p>Mr. Bennet was so odd a mixture of quick parts, and sarcastic humour.</p>' +
        '<h2>Section</h2><p>She was a woman of mean understanding, little information, and uncertain temper.</p>',
      charCount: 200,
    },
    {
      idx: 1,
      title: 'Chapter 2',
      href: 'chapter2.html',
      contentHtml:
        '<p>Mr. Darcy was attracted by her fine eyes, but nevertheless a conversation with her was impossible.</p>' +
        '<div>He began to feel the danger of paying her too much attention.</div>',
      charCount: 120,
    },
  ];
}

// ТОЧНА копія логіки з ReaderScreen (E4 хук)
function chaptersFromDb(dbChapters) {
  const out = [];
  let idx = 0;
  for (const ch of dbChapters) {
    const plain = ch.contentHtml
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<(p|div|br|h[1-6]|li|\/p|\/div|\/h[1-6]|\/li)\b[^>]*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim()
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const sentence of plain) {
      out.push({ index: idx++, original: sentence, translation: '' });
    }
  }
  return out;
}

const dbChapters = getSampleChapters();
const chapters = chaptersFromDb(dbChapters);

// Перевірки
let fail = 0;
if (chapters.length === 0) { console.log('FAIL: 0 paragraphs'); fail++; }
// Контроль: жоден параграф не повинен бути href/посиланням
const badHref = chapters.filter((p) => /\.html$|chapter\d+\.html/.test(p.original));
if (badHref.length > 0) { console.log('FAIL: paragraph is href:', badHref[0].original); fail++; }
// Контроль: параграфи містять текст, а не теги
const hasTags = chapters.filter((p) => /<[^>]+>/.test(p.original));
if (hasTags.length > 0) { console.log('FAIL: paragraph has HTML tags:', hasTags[0].original); fail++; }

console.log(`Paragraphs: ${chapters.length}`);
console.log('First 3:');
chapters.slice(0, 3).forEach((p) => console.log(`  [${p.index}] ${p.original.slice(0, 60)}...`));
console.log(fail === 0 ? 'E4 LOGIC OK ✅' : `E4 LOGIC FAILED ❌ (${fail} errors)`);
process.exit(fail === 0 ? 0 : 1);
