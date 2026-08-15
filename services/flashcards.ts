/**
 * flashcards.ts — E7: карти слів + Spaced Repetition (SM-2).
 *
 * ЧОМУ ТАК (для наступного агента):
 *  - Алгоритм SM-2 (SuperMemo) зберігаємо у books.db.word_cards (box_level + due_at).
 *  - Тап по слову → addCard(); повторення → review(cardId, quality 0..5) оновлює box_level/due_at.
 *  - Експорт в Anki — share-intent TSV (word\tdefinition), без прив'язки до БД Anki (spec 3.7).
 *  - Це ізольований модуль; UI-екран колоди (FlashList) робиться в етапі E7-UI.
 */
import * as SQLite from 'expo-sqlite';
import { getBooksDb } from './db';

interface CardRow {
  id: number;
  word: string;
  lang_from: string;
  lang_to: string;
  definition: string;
  example: string;
  box_level: number;
  due_at: number;
}

/** Додати картку (або оновити існуючу для того ж слова+пари). */
export function addCard(
  word: string,
  langFrom: string,
  langTo: string,
  definition: string,
  example = ''
): number {
  const db = getBooksDb();
  const existing = db.getFirstSync(
    `SELECT id FROM word_cards WHERE word = ? AND lang_from = ? AND lang_to = ?`,
    [word, langFrom, langTo]
  ) as { id: number } | null;
  const now = Date.now();
  if (existing) {
    db.runSync(`UPDATE word_cards SET definition = ?, example = ?, due_at = ? WHERE id = ?`, [
      definition,
      example,
      now,
      existing.id,
    ]);
    return existing.id;
  }
  const res = db.runSync(
    `INSERT INTO word_cards (word, lang_from, lang_to, definition, example, box_level, due_at, created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [word, langFrom, langTo, definition, example, 1, now, now]
  );
  return res.lastInsertRowId ?? -1;
}

/** Карти, що "due" (interval повторень). */
export function getDueCards(limit = 50): CardRow[] {
  const db = getBooksDb();
  return db.getAllSync(
    `SELECT id, word, lang_from, lang_to, definition, example, box_level, due_at
     FROM word_cards WHERE due_at <= ? ORDER BY due_at LIMIT ?`,
    [Date.now(), limit]
  ) as CardRow[];
}

export function getAllCards(): CardRow[] {
  const db = getBooksDb();
  return db.getAllSync(
    `SELECT id, word, lang_from, lang_to, definition, example, box_level, due_at FROM word_cards ORDER BY created_at DESC`,
    []
  ) as CardRow[];
}

/**
 * SM-2 review. quality: 0..5 (0-2 = забув, 3-5 = згадав).
 * Повертає новий box_level і наступний due_at (в днях помножено на 86400000).
 */
export function reviewCard(cardId: number, quality: number): { boxLevel: number; dueAt: number } {
  const db = getBooksDb();
  const row = db.getFirstSync(`SELECT box_level, due_at FROM word_cards WHERE id = ?`, [cardId]) as
    | { box_level: number; due_at: number }
    | null;
  if (!row) return { boxLevel: 1, dueAt: Date.now() };

  let box = row.box_level;
  if (quality < 3) {
    box = 1; // забув → в початок
  } else {
    box = Math.min(box + 1, 6);
  }
  // Інтервал за SM-2 (спрощено): 1,3,7,16,35,70 днів для box 1..6
  const intervals = [1, 3, 7, 16, 35, 70];
  const days = intervals[Math.min(box, 6) - 1] ?? 1;
  const dueAt = Date.now() + days * 86400000;

  db.runSync(`UPDATE word_cards SET box_level = ?, due_at = ? WHERE id = ?`, [box, dueAt, cardId]);
  return { boxLevel: box, dueAt };
}

/** Експорт у TSV для Anki (word<TAB>definition). */
export function exportCardsTsv(): string {
  const cards = getAllCards();
  return cards.map((c) => `${c.word}\t${c.definition.replace(/\t/g, ' ')}`).join('\n');
}

export type { CardRow };
