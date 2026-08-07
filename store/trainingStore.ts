// store/trainingStore.ts
// Прогресс интервального повторения (упрощённый SM-2 / Leitner).
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DictionaryEntry } from './dictionaryStore';

export interface TrainingProgress {
  word: string; // == DictionaryEntry.word
  lang: string;
  box: number; // Leitner-коробка: 1..5 (чем выше, тем реже повторяем)
  nextReviewAt: number; // timestamp
  correctStreak: number;
  lastSeenAt?: number;
}

interface TrainingState {
  progress: Record<string, TrainingProgress>; // key = `${word}|${lang}`
  recordAnswer: (word: string, lang: string, correct: boolean) => void;
  dueWords: (entries: DictionaryEntry[], now?: number) => TrainingProgress[];
}

const BOX_INTERVALS_DAYS = [0, 1, 3, 7, 16, 30]; // index = box

function keyOf(word: string, lang: string) {
  return `${word}|${lang}`;
}

export const useTrainingStore = create<TrainingState>()(
  persist(
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
          .map((e) => get().progress[keyOf(e.word, e.lang)])
          .filter((p): p is TrainingProgress => !!p && p.nextReviewAt <= now),
    }),
    {
      name: 'bookreader-training',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
