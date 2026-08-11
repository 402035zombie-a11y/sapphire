// utils/bookWords.ts
// Извлечение уникальных слов книги с подсчётом частоты вхождений.
import { normalizeWord } from './wordTokenizer';

export interface BookWordFreq {
  word: string;
  frequency: number;
}

// Слова короче 2 букв и чисто не-буквенные токены отсеиваем.
export function extractBookWords(paragraphs: { original: string }[]): BookWordFreq[] {
  const counts = new Map<string, number>();
  for (const p of paragraphs) {
    const tokens = p.original.split(/\s+/);
    for (const tok of tokens) {
      const w = normalizeWord(tok);
      if (w.length < 2) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([word, frequency]) => ({ word, frequency }))
    .sort((a, b) => b.frequency - a.frequency);
}
