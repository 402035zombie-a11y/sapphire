/**
 * scripts/build-catalog.mjs — ГЕНЕРАТОР catalog.json (E9, ПРИВАТНА ІНФРА, гібрид).
 *
 * ЧОМУ ТАК (для наступного агента):
 *  - Каталог — локальний JSON (assets/catalog.json), не важкий сайт Gutenberg напряму.
 *  - Джерело: Project Gutenberg (public domain). EPUB-лінки форми
 *    https://www.gutenberg.org/ebooks/{id}.epub.noimages (no-images = легше для бідних країн).
 *  - UA public domain: додати кілька перекладів/оригіналів (заглушки — доповнити вручну).
 *  - Запуск: node scripts/build-catalog.mjs → пише assets/catalog.json.
 *  - Цей файл НЕ публікується як код апки (гібрид), але catalog.json може бути asset-ом.
 */
import { writeFileSync, mkdirSync } from 'fs';

// Базовий список — розширювати. id з gutenberg.org/ebooks/{id}
const GUTENBERG = [
  { id: '1342', title: 'Pride and Prejudice', author: 'Jane Austen', lang: 'en' },
  { id: '11', title: 'Alice’s Adventures in Wonderland', author: 'Lewis Carroll', lang: 'en' },
  { id: '2600', title: 'War and Peace', author: 'Leo Tolstoy', lang: 'en' },
  { id: '84', title: 'Frankenstein', author: 'Mary Shelley', lang: 'en' },
  { id: '1661', title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle', lang: 'en' },
  { id: '2701', title: 'Moby-Dick', author: 'Herman Melville', lang: 'en' },
  { id: '98', title: 'A Tale of Two Cities', author: 'Charles Dickens', lang: 'en' },
  { id: '1080', title: 'A Christmas Carol', author: 'Charles Dickens', lang: 'en' },
];

// UA public domain (заглушки — замінити реальними лінками, коли з'являться)
const UKRAINIAN = [
  { id: 'ua-taras', title: 'Кобзар', author: 'Тарас Шевченко', lang: 'uk', epubUrl: '' },
];

const entries = [
  ...GUTENBERG.map((b) => ({
    id: `g${b.id}`,
    title: b.title,
    author: b.author,
    lang: b.lang,
    epubUrl: `https://www.gutenberg.org/ebooks/${b.id}.epub.noimages`,
  })),
  ...UKRAINIAN.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    lang: b.lang,
    epubUrl: b.epubUrl,
  })),
];

const out = 'assets/catalog.json';
mkdirSync('assets', { recursive: true });
writeFileSync(out, JSON.stringify(entries, null, 2));
console.log(`Built ${out}: ${entries.length} entries`);
