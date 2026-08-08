// store/trainingStore.ts
// Прогресс интервального повторения (упрощённый SM-2 / Leitner).
import { persist } from './createStore';
import { DictionaryEntry } from './dictionaryStore';

export interface TrainingProgress {
  word: string;
  lang: string;
  box: number;
  nextReviewAt: number;
  correctStreak: number;
  lastSeenAt?: number;
}

interface TrainingState {
  progress: Record<string, TrainingProgress>;
  recordAnswer: (word: string, lang: string, correct: boolean) => void;
  dueWords: (entries: DictionaryEntry[], now?: number) => TrainingProgress[];
}

const BOX_INTERVALS_DAYS = [0, 1, 3, 7, 16, 30];

function keyOf(word: string, lang: string) {
  return `${word}|${lang}`;
}

export const useTrainingStore = persist<TrainingState>(
  (set, get) => ({
    progress: {},
    recordAnswer: (word, lang, correct) =>
      set((s) => {
        const k = keyOf(word, lang);
        const prev = s.progress[k];
        const prevBox = prev?.box ?? 1;
        const box = correct ? Math.min(prevBox + 1, 5) : 1;
        const days = BOX_INTERVALS_DAYS[box] ?? 1;
        const nextReviewAt = Date.now() + days * 24 * 60 * 60 * 1000;
        return {
          progress: {
            ...s.progress,
            [k]: {
              word,
              lang,
              box,
              nextReviewAt,
              correctStreak: correct ? (prev?.correctStreak ?? 0) + 1 : 0,
              lastSeenAt: Date.now(),
            },
          },
        };
      }),
    dueWords: (entries, now = Date.now()) =>
      entries
        .map((e) => get().progress[keyOf(e.word, e.lang)] as TrainingProgress | undefined)
        .filter((p): p is TrainingProgress => !!p && p.nextReviewAt <= now),
  }),
  { name: 'bookreader-training' },
);
