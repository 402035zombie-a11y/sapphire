/**
 * fsrsDb.ts — FSRS-прогрес у books.db (таблиця fsrs_state).
 * Замість Record у AsyncStorage: точковий UPSERT при кожній відповіді,
 * O(1) читання стану слова, батч-завантаження для тренування/словника.
 */
import * as SQLite from 'expo-sqlite';
import { getBooksDb } from './db';
import type { FsrsState } from './fsrs';

export interface ProgressRow {
  word: string;
  lang: string;
  difficulty: number;
  stability: number;
  lastReview: number;
  box: number; // legacy для UI
  nextReviewAt: number;
  correctStreak: number;
  correctCount: number;
  wrongCount: number;
  lastSeenAt?: number;
}

interface RowRaw {
  word: string;
  lang: string;
  difficulty: number | null;
  stability: number | null;
  last_review: number | null;
  box: number | null;
  next_review_at: number;
  correct_streak: number | null;
  correct_count: number | null;
  wrong_count: number | null;
  last_seen_at: number | null;
}

const toRow = (r: RowRaw): ProgressRow => ({
  word: r.word,
  lang: r.lang,
  difficulty: r.difficulty ?? 7,
  stability: r.stability ?? 0,
  lastReview: r.last_review ?? 0,
  box: r.box ?? 1,
  nextReviewAt: r.next_review_at,
  correctStreak: r.correct_streak ?? 0,
  correctCount: r.correct_count ?? 0,
  wrongCount: r.wrong_count ?? 0,
  lastSeenAt: r.last_seen_at ?? undefined,
});

export function getProgress(word: string, lang: string): ProgressRow | null {
  const db = getBooksDb();
  const r = db.getFirstSync(
    `SELECT * FROM fsrs_state WHERE word = ? AND lang = ?`,
    [word, lang]
  ) as RowRaw | null;
  return r ? toRow(r) : null;
}

export function upsertProgress(p: {
  word: string;
  lang: string;
  difficulty: number;
  stability: number;
  lastReview: number;
  box: number;
  nextReviewAt: number;
  correctStreak: number;
  correctCount: number;
  wrongCount: number;
  lastSeenAt?: number;
}): void {
  const db = getBooksDb();
  db.runSync(
    `INSERT INTO fsrs_state (word, lang, difficulty, stability, last_review, box, next_review_at, correct_streak, correct_count, wrong_count, last_seen_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(word, lang) DO UPDATE SET
       difficulty=excluded.difficulty, stability=excluded.stability, last_review=excluded.last_review,
       box=excluded.box, next_review_at=excluded.next_review_at, correct_streak=excluded.correct_streak,
       correct_count=excluded.correct_count, wrong_count=excluded.wrong_count, last_seen_at=excluded.last_seen_at`,
    [p.word, p.lang, p.difficulty, p.stability, p.lastReview, p.box, p.nextReviewAt,
     p.correctStreak, p.correctCount, p.wrongCount, p.lastSeenAt ?? null]
  );
}

/** Усі записи (для словника-знімка). При 200к рядків ~200ms. */
export function getAllProgress(): Record<string, ProgressRow> {
  const db = getBooksDb();
  const rows = db.getAllSync(`SELECT * FROM fsrs_state`) as RowRaw[];
  const out: Record<string, ProgressRow> = {};
  for (const r of rows) out[`${r.word}|${r.lang}`] = toRow(r);
  return out;
}

/** Стани для конкретного набору слів (екран тренування). */
export function getProgressBatch(keys: { word: string; lang: string }[]): Record<string, ProgressRow> {
  const out: Record<string, ProgressRow> = {};
  if (!keys.length) return out;
  const db = getBooksDb();
  const CHUNK = 400;
  for (let i = 0; i < keys.length; i += CHUNK) {
    const part = keys.slice(i, i + CHUNK);
    const wPh = part.map(() => '?').join(',');
    // (word,lang) IN ((?,?),(?,?)...) — пари
    const pairs = part.map(() => `(?,?)`).join(',');
    const flat = part.flatMap((k) => [k.word, k.lang]);
    const rows = db.getAllSync(
      `SELECT * FROM fsrs_state WHERE (word, lang) IN (${pairs})`,
      flat
    ) as RowRaw[];
    for (const r of rows) out[`${r.word}|${r.lang}`] = toRow(r);
  }
  return out;
}

export type { FsrsState };
