// services/ankiExport.ts
// Експорт словника Sapphire у формат Anki (.apkg).
//
// Формат .apkg (мінімальний, сумісний з Anki 2.1):
//   collection.anki2  — SQLite база Anki (col, notes, cards, revlog, graves таблиці)
//   media             — JSON файл "{"0": null}" (порожній список медіа)
//
// Схема notes: id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data
//   flds — поля розділені \x1f (unit separator): [Front, Back]
//   csum  — перші 8 hex символів SHA1 першого поля
// Схема cards: id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps,
//              lapses, left, odue, odid, flags, data
//
// Ми НЕ пишемо revlog/історію — Anki приймає нові нотатки без неї.

import * as SQLite from 'expo-sqlite';
import JSZip from 'jszip';

const UNIT_SEP = '\x1f';
// Стандартна Basic модель Anki: Front / Back
const MODEL_ID = 1607392319001;
const DECK_ID = 1607392319002;

export interface AnkiCard {
  front: string; // слово
  back: string; // переклад
}

/** SHA-1 перших 8 hex символів для csum (проста реалізація без залежностей). */
function checksum(text: string): number {
  // Anki використовує перші 8 hex символів SHA1 поля. Повний SHA1 на RN без бібліотеки
  // складний, але Anki приймає ЛЮБИЙ числовий csum при імпорті (перераховує сам).
  // Детермінований хеш — достатньо для унікальності в межах файлу.
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 0xffffffff;
}

function guidFor(word: string, lang: string): string {
  // детермінований guid: повторний експорт того ж слова = той самий guid → Anki дедупить
  let h = '';
  let x = 7;
  for (let i = 0; i < word.length + lang.length; i++) {
    const c = (word + lang).charCodeAt(i % (word.length + lang.length));
    x = ((x * 31) + c) | 0;
    h += Math.abs(x % 16).toString(16);
  }
  return h.slice(0, 10);
}

export function buildAnkiSql(cards: AnkiCard[], deckName: string): string {
  const now = Math.floor(Date.now() / 1000);
  const esc = (s: string) => s.replace(/'/g, "''");
  const lines: string[] = [];

  lines.push('PRAGMA writable_schema = OFF;');
  lines.push('BEGIN TRANSACTION;');
  // col — ПОВНИЙ рядок (13 полів): id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags
  // Попередня версія писала тільки 6 значень → Anki відмовлялась відкривати файл.
  const confJson = JSON.stringify({
    1: {
      deckConfId: 1, name: 'Default', maxTaken: 60, autoplay: true, timer: 0, replayq: true,
      new: [{ delays: [1, 10], ints: [1, 4, 7], initialFactor: 2500, perDay: 20, units: 'd', order: 1, separate: true, ints2: [1] }],
      rev: { perDay: 200, fuzz: 0.05, ivlFct: 1, maxIvl: 36500, ease4: 1.3, bury: true, minSpace: 1 },
      lapse: { delays: [10], newIvl: 0, leechFails: 8, leechAction: 0 },
    },
  }).replace(/'/g, "''");
  lines.push(`INSERT INTO col VALUES(1,${now},${now},${now * 1000},11,0,-1,0,'${confJson}','{}','{}','{}','{}');`);
  // decks: Default + наша колода
  const decksJson = JSON.stringify({
    [DECK_ID]: {
      id: DECK_ID, name: deckName, mod: now, usn: -1, lrnToday: [0, 0], revToday: [0, 0],
      newToday: [0, 0], timeToday: [0, 0], collapsed: false, browserCollapsed: false, desc: '',
      dyn: 0, conf: 1, extendNew: 0, extendRev: 0,
    },
    1: { id: 1, name: 'Default', mod: now, usn: 0, lrnToday: [0, 0], revToday: [0, 0], newToday: [0, 0], timeToday: [0, 0], collapsed: false, browserCollapsed: false, desc: '', dyn: 0, conf: 1, extendNew: 0, extendRev: 0 },
  }).replace(/'/g, "''");
  lines.push(`INSERT INTO col(decks) VALUES('${decksJson}');`);
  // models: Basic
  const modelsJson = JSON.stringify({
    [MODEL_ID]: {
      id: MODEL_ID, name: 'Basic (Sapphire)', type: 0, mod: now, usn: -1,
      sortf: 0, did: DECK_ID, tmpls: [{ name: 'Card 1', ord: 0, qfmt: '{{Front}}', afmt: '{{FrontSide}}<hr id="answer">{{Back}}', bqfmt: '', bafmt: '', did: null, bfont: '', bsize: 0 }],
      flds: [
        { name: 'Front', ord: 0, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
        { name: 'Back', ord: 1, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
      ],
      css: '.card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }',
      latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
      latexPost: '\\end{document}', latexsvg: false, req: [[0, 'any', [0]]],
      tags: [], vers: [],
    },
  }).replace(/'/g, "''");
  lines.push(`UPDATE col SET models='${modelsJson}' WHERE id=1;`);

  let cardId = now * 1000;
  cards.forEach((c, idx) => {
    const nid = now * 1000 + idx + 1;
    const flds = `${c.front.replace(/\x1f/g, '')}${UNIT_SEP}${c.back.replace(/\x1f/g, '')}`;
    const csum = checksum(c.front);
    const guid = guidFor(c.front, String(idx));
    lines.push(`INSERT INTO notes VALUES(${nid},'${guid}',${MODEL_ID},${now},-1,'','${esc(flds)}','${esc(c.front)}',${csum},0,'');`);
    lines.push(`INSERT INTO cards VALUES(${cardId++},${nid},${DECK_ID},0,${now},-1,0,0,0,0,0,0,0,0,0,0,0,'');`);
  });

  lines.push('COMMIT;');
  return lines.join('\n');
}

/** Згенерувати .apkg (base64) зі списку карток. */
export async function buildApkgBase64(cards: AnkiCard[], deckName: string): Promise<string> {
  const sql = buildAnkiSql(cards, deckName);

  // Створюємо тимчасову SQLite базу через expo-sqlite, виконуємо SQL, читаємо байти.
  const dbName = `anki-export-${Date.now()}.db`;
  const db = SQLite.openDatabaseSync(dbName);
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS col (
        id integer primary key, crt integer, mod integer, scm integer, ver integer,
        dty integer, usn integer, ls integer, conf text not null, models text not null,
        decks text not null, dconf text not null, tags text not null);
      CREATE TABLE IF NOT EXISTS notes (
        id integer primary key, guid text not null, mid integer not null, mod integer not null,
        usn integer not null, tags text not null, flds text not null, sfld integer not null,
        csum integer not null, flags integer not null, data text not null);
      CREATE TABLE IF NOT EXISTS cards (
        id integer primary key, nid integer not null, did integer not null, ord integer not null,
        mod integer not null, usn integer not null, type integer not null, queue integer not null,
        due integer not null, ivl integer not null, factor integer not null, reps integer not null,
        lapses integer not null, left integer not null, odue integer not null, odid integer not null,
        flags integer not null, data text not null);
      CREATE TABLE IF NOT EXISTS revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null, ivl integer not null, lastIvl integer not null, factor integer not null, time integer not null, type integer not null);
      CREATE TABLE IF NOT EXISTS graves (usn integer not null, oid integer not null, type integer not null);
      CREATE INDEX IF NOT EXISTS ix_notes_usn ON notes (usn);
      CREATE INDEX IF NOT EXISTS ix_cards_usn ON cards (usn);
      CREATE INDEX IF NOT EXISTS ix_revlog_usn ON revlog (usn);
      CREATE INDEX IF NOT EXISTS ix_cards_nid ON cards (nid);
      CREATE INDEX IF NOT EXISTS ix_cards_sched ON cards (did, queue, due);
      CREATE INDEX IF NOT EXISTS ix_revlog_cid ON revlog (cid);
      CREATE INDEX IF NOT EXISTS ix_notes_csum ON notes (csum);
    `);
    db.execSync(sql);
    db.closeSync();

    // Читання файлу бази як base64 через expo-file-system
    // @ts-ignore — legacy API
    const FileSystem = require('expo-file-system/legacy');
    const dbPath = `${FileSystem.documentDirectory}SQLite/${dbName}`;
    const b64 = await FileSystem.readAsStringAsync(dbPath, { encoding: 'base64' });
    // прибираємо тимчасовий файл
    try { await FileSystem.deleteAsync(dbPath, { idempotent: true }); } catch {}

    const zip = new JSZip();
    zip.file('collection.anki2', b64, { base64: true });
    zip.file('media', '{}');
    zip.file('meta', JSON.stringify({ version: 11 }));
    const content = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });
    return content;
  } catch (e) {
    try { db.closeSync(); } catch {}
    throw e;
  }
}
