/**
 * scripts/build-dict.mjs — ГЕНЕРАТОР офлайн-словника (E5).
 *
 * ЧОМУ ТАК (для наступного агента — ПРИВАТНА ІНФРА, гібрид-модель):
 *  - Джерело: kaikki.org (Wiktionary, CC-BY-SA). Повний EN дамп ~2.6GB gz.
 *  - Цей скрипт качає/читає JSONL (one object/line) і будує dict_<lang>.db з FTS5.
 *  - dict_<lang>.db НЕ публікується (гібрид): клон апки без нього порожній.
 *  - Запуск: node scripts/build-dict.mjs <lang> <input.jsonl.gz> [limit]
 *    lang=en, input=data/kaikki_en.sample.jsonl.gz, limit=опц. (демо обмежує к-сть слів).
 *
 * Схема dict_<lang>.db:
 *   dict_entries(word, lang, pos, definition_json, stem) — FTS5 virtual table
 *   stem обчислюємо простим lower+trim (повна морфологія — пізніше, див. spec 3.5).
 */
import { createRequire } from 'module';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import { gunzipSync, createGunzip } from 'zlib';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const [, , lang = 'en', input, limitArg] = process.argv;
const limit = limitArg ? parseInt(limitArg, 10) : Infinity;

if (!input || !existsSync(input)) {
  console.error('Usage: node scripts/build-dict.mjs <lang> <input.jsonl[.gz]> [limit]');
  process.exit(1);
}

const outDb = `data/dict_${lang}.db`;
if (existsSync(outDb)) require('fs').unlinkSync(outDb);

const db = new Database(outDb);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS dict_entries USING fts5(
    word, lang, pos, definition_json, stem,
    tokenize='unicode61 remove_diacritics 2'
  );
`);
const insert = db.prepare(
  `INSERT INTO dict_entries (word, lang, pos, definition_json, stem) VALUES (?,?,?,?,?)`
);

function stem(w) {
  return w.toLowerCase().trim();
}

async function* lines(stream) {
  let buf = '';
  for await (const chunk of stream) {
    buf += chunk.toString('utf8');
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (line.trim()) yield line;
    }
  }
  if (buf.trim()) yield buf;
}

async function run() {
  const src = input.endsWith('.gz')
    ? createReadStream(input).pipe(createGunzip())
    : createReadStream(input);

  let count = 0;
  const tx = db.transaction(() => {});
  db.exec('BEGIN');
  for await (const line of lines(src)) {
    if (count >= limit) break;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    const word = rec.word;
    if (!word) continue;
    const posRaw = rec.pos;
    const pos = (Array.isArray(posRaw) ? posRaw : (posRaw ? [posRaw] : [])).join(',');
    // senses → glosses (англійські визначення)
    const senses = rec.senses || [];
    const defs = senses
      .map((s) => (typeof s.glosses === 'string' ? s.glosses : (s.glosses || []).join('; ')))
      .filter(Boolean)
      .slice(0, 5);
    if (!defs.length) continue;
    const definition_json = JSON.stringify({ glosses: defs, pos });
    insert.run(word, lang, pos, definition_json, stem(word));
    count++;
  }
  db.exec('COMMIT');
  console.log(`Built ${outDb}: ${count} entries`);
  db.close();
}

run().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
