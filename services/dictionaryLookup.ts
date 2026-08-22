/**
 * dictionaryLookup.ts — E5: lookup слів у dict_<lang>.db (FTS5).
 *
 * ЧОМУ ТАК (для наступного агента):
 *  - Словник живе у окремій БД dict_<lang>.db (on-demand, read-only) — ізоляція від books.db (spec 3.2/3.5).
 *  - Пошук через FTS5 (MATCH) — миттєвий навіть на великих дампах (на відміну від JSON-фільтру).
 *  - dict_fle_path — шлях до скачаного .db (on-demand per мова). Якщо null → словник недоступний (offline-режим).
 *  - Цей сервіс НЕ знає про мережу; фолбек на Lingva/онлайн — в translationService (E6).
 */
import * as SQLite from 'expo-sqlite';

export interface DictEntry {
  word: string;
  pos: string;
  definition: string;
}

let openDbs: Record<string, SQLite.SQLiteDatabase> = {};

/** Відкрити словник мови (або повернути вже відкритий). dictPath — шлях до .db. */
export function loadDict(lang: string, dictPath: string): void {
  if (openDbs[lang]) return;
  openDbs[lang] = SQLite.openDatabaseSync(dictPath);
}

export function isDictLoaded(lang: string): boolean {
  return !!openDbs[lang];
}

export function unloadDict(lang: string): void {
  openDbs[lang]?.closeSync();
  delete openDbs[lang];
}

/** FTS5 lookup по слову (точне + prefix). Повертає до limit записів. */
export function lookupWord(lang: string, word: string, limit = 5): DictEntry[] {
  const db = openDbs[lang];
  if (!db) return [];
  const q = word.trim().toLowerCase().replace(/"/g, '');
  if (!q) return [];
  const rows = db.getAllSync(
    `SELECT word, pos, definition_json FROM dict_entries WHERE dict_entries MATCH ? ORDER BY rank LIMIT ?`,
    [`"${q}"*`, limit]
  ) as { word: string; pos: string; definition_json: string }[];
  return rows.map((r) => ({
    word: r.word,
    pos: r.pos,
    definition: (() => {
      try {
        return JSON.parse(r.definition_json).glosses?.join('; ') ?? '';
      } catch {
        return '';
      }
    })(),
  }));
}
