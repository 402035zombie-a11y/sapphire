// utils/bookWords.ts
// Извлечение уникальных слов книги с подсчётом частоты вхождений + контекст-речення.
import { normalizeWord } from './wordTokenizer';

export interface BookWordFreq {
  word: string;
  frequency: number;
  /** Перше речення з книги, де слово зустрічається (для cloze-режиму) */
  context: string;
}

/** Розбити текст на речення (проста евристика — термінальна пунктуація + пробіл). */
function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const WORD_RE = /[a-zA-Zа-яА-ЯїЇєЄіІґҐёЁ'-]+/g;

export function extractBookWords(paragraphs: { original: string }[]): BookWordFreq[] {
  const counts = new Map<string, { frequency: number; context: string }>();

  // Попередньо розбиваємо всі абзаци на речення — один прохід для пошуку контексту
  const sentences: string[] = [];
  for (const p of paragraphs) sentences.push(...splitSentences(p.original));

  // Індекс: нормалізоване слово → перше речення, де воно є
  const firstSentence = new Map<string, string>();
  for (const s of sentences) {
    const tokens = (s.match(WORD_RE) || []).map((w) => normalizeWord(w));
    const seenInThisSentence = new Set<string>();
    for (const w of tokens) {
      if (w.length < 2 || seenInThisSentence.has(w)) continue;
      seenInThisSentence.add(w);
      if (!firstSentence.has(w)) firstSentence.set(w, s.length <= 260 ? s : s.slice(0, 257) + '...');
    }
  }

  for (const p of paragraphs) {
    const tokens = p.original.split(/\s+/);
    for (const tok of tokens) {
      const w = normalizeWord(tok);
      if (w.length < 2) continue;
      const prev = counts.get(w);
      if (prev) {
        prev.frequency += 1;
      } else {
        counts.set(w, { frequency: 1, context: firstSentence.get(w) ?? '' });
      }
    }
  }

  return Array.from(counts.entries())
    .map(([word, v]) => ({ word, frequency: v.frequency, context: v.context }))
    .sort((a, b) => b.frequency - a.frequency);
}
