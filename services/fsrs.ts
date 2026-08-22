// services/fsrs.ts
// FSRS (Free Spaced Repetition Scheduler) — спрощена реалізація моделі пам'яті.
// Три змінні на слово:
//   D (difficulty)  1..10  — наскільки слово складне для юзера
//   S (stability)   днів   — через скільки днів retrievability падає до 90%
//   R (retrievability) 0..1 — поточна ймовірність, що слово пам'ятається
//
// Параметри FSRS-4.5 (дефолти для binary-відповідей), адаптовані:
//   w = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 0.8491, 2.4924, 0.2579, 0.2579]
// Спрощення проти повного FSRS: 4 градації мапляться в 3 стани (again/hard|good/easy)
// через grade: 1=again, 2=hard, 3=good, 4=easy.

export type Grade = 1 | 2 | 3 | 4; // again | hard | good | easy

export interface FsrsState {
  difficulty: number; // D 1..10
  stability: number; // S днів (>= 0.1)
  lastReview: number; // epoch ms
}

const W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474,
  0.1367, 0.8491, 2.4924, 0.2579, 0.2579,
];

const DECAY = -0.5; // крива забування R = (1 + FACTOR * t/S)^DECAY
const FACTOR = 19 / 81;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Ймовірність, що слово пам'ятається через elDays днів після останнього повторення. */
export function retrievability(st: FsrsState, now = Date.now()): number {
  const elDays = Math.max(0, (now - st.lastReview) / 86_400_000);
  const s = Math.max(0.1, st.stability);
  return Math.pow(1 + FACTOR * (elDays / s), DECAY);
}

/** Наступний інтервал (днів), щоб R на момент показу була ~0.9. */
export function nextIntervalDays(st: FsrsState, grade: Grade): number {
  const s = nextStability(st, grade);
  // інтервал, при якому R(t) = 0.9: t = S * ((0.9)^(1/DECAY) - 1) / FACTOR
  const t = s * (Math.pow(0.9, 1 / DECAY) - 1) / FACTOR;
  // округлення: <1дн → години-подвійки, далі — людські числа
  if (t < 1) return Math.max(0.02, Math.round(t * 12) / 12); // крок 2 год
  if (t < 30) return Math.round(t);
  if (t < 365) return Math.round(t / 5) * 5;
  return Math.round(t / 15) * 15;
}

function nextStability(st: FsrsState, grade: Grade): number {
  const s = Math.max(0.1, st.stability);
  const d = clamp(st.difficulty, 1, 10);
  if (st.lastReview === 0 || s <= 0.1) {
    // перше вивчення: базові значення з w
    const base = grade === 1 ? W[0] : W[grade - 1]; // again → короткий
    return Math.max(0.1, base);
  }
  const r = retrievability(st);
  if (grade === 1) {
    // забув: stability скидається, але не повністю (враховуємо минулий досвід)
    const newS = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[12]) - 1) * Math.exp(W[10] * (1 - r));
    return clamp(newS, 0.1, s); // після забування S не перевищує попередню
  }
  // hard/good/easy: зростання
  const inc = 1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1);
  const hardPenalty = grade === 2 ? W[15 - 3] ?? 1 : 1; // W[12]... спрощено: hard множник
  const mult = grade === 2 ? 1.2 / 1.0 : grade === 4 ? 1.3 : 1.0; // hard ~×1.2, easy ×1.3 поверх
  const newS = s * Math.max(1, inc) * (grade === 2 ? 1 : 1) * mult * hardPenalty;
  return clamp(newS, 0.1, 36500);
}

function nextDifficulty(st: FsrsState, grade: Grade): number {
  const d = clamp(st.difficulty, 1, 10);
  // grade 1 → складніше (+), 4 → легше (-). Крок залежить від W[6]
  const delta = -W[6] * (grade - 3); // again: +2*w6, hard: +w6, good: 0, easy: -w6
  const meanRev = 7; // mean reversion до базової складності
  const newD = d + delta * (1 - d / 10) + (meanRev / 10 - d / 10) * W[7];
  return clamp(newD, 1, 10);
}

/** Повний крок FSRS: повертає новий стан + інтервал до наступного показу (днів). */
export function review(st: FsrsState, grade: Grade, now = Date.now()): { state: FsrsState; intervalDays: number } {
  const state: FsrsState = {
    difficulty: st.lastReview === 0 ? clamp(6 + 0.5, 1, 10) : nextDifficulty(st, grade),
    stability: nextStability(st, grade),
    lastReview: now,
  };
  return { state, intervalDays: nextIntervalDays({ ...state, stability: state.stability }, grade) };
}

/** Міграція старих Leitner-боксів → початковий FSRS-стан. */
export function fromBox(box: number, correctCount = 0, wrongCount = 0): FsrsState {
  // box 1..5 → приблизна stability: 1→0.5дн, 2→2, 3→6, 4→14, 5→30
  const table = [0.5, 0.5, 2, 6, 14, 30];
  const s = table[clamp(box, 1, 5)] ?? 0.5;
  // складність: багато помилок → складніше
  const total = correctCount + wrongCount;
  const acc = total > 0 ? correctCount / total : 0.8;
  const d = clamp(10 - acc * 6, 1, 10); // 100% точність → D≈4, 0% → D=10
  return { difficulty: d, stability: s, lastReview: Date.now() };
}
