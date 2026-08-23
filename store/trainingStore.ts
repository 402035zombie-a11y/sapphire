// store/trainingStore.ts
// Прогрес інтервального повторення — FSRS (модель пам'яті D/S/R).
// Дані в books.db (services/fsrsDb.ts): UPSERT при відповіді, знімок у пам'яті для рендеру.
import { persist } from './createStore';
import { DictionaryEntry } from './dictionaryStore';
import * as fsrsDb from '../services/fsrsDb';
import { FsrsState, Grade, review as fsrsReview, retrievability, fromBox } from '../services/fsrs';

export interface TrainingProgress extends FsrsState {
  word: string;
  lang: string;
  /** @deprecated старий Leitner box (1..5) — лишено для сумісності UI */
  box: number;
  nextReviewAt: number;
  correctStreak: number;
  correctCount: number;
  wrongCount: number;
  lastSeenAt?: number;
}

/** Градація відповіді: 1=again(забув) 2=hard 3=good 4=easy */
export type AnswerGrade = Grade;

interface TrainingState {
  progress: Record<string, TrainingProgress>;
  reload: () => void;
  recordAnswer: (word: string, lang: string, grade: AnswerGrade) => void;
  dueWords: (entries: DictionaryEntry[], now?: number, opts?: { bookId?: string; excludeLearned?: boolean }) => TrainingProgress[];
  levelOf: (word: string, lang: string) => 'new' | 'learning' | 'learned';
  urgencyOf: (word: string, lang: string) => number;
}

function keyOf(word: string, lang: string) {
  return `${word}|${lang}`;
}

export const useTrainingStore = persist<TrainingState>(
  (set, get) => ({
    progress: {},
    reload: () => set(() => ({ progress: fsrsDb.getAllProgress() as Record<string, TrainingProgress> })),
    recordAnswer: (word, lang, grade) =>
      set((s) => {
        const k = keyOf(word, lang);
        const prev = s.progress[k];
        const now = Date.now();
        const base: FsrsState =
          prev && prev.stability != null
            ? { difficulty: prev.difficulty, stability: prev.stability, lastReview: prev.lastReview ?? 0 }
            : prev
              ? fromBox(prev.box ?? 1, prev.correctCount ?? 0, prev.wrongCount ?? 0)
              : { difficulty: 7, stability: 0, lastReview: 0 };
        const { state, intervalDays } = fsrsReview(base, grade);
        const next: TrainingProgress = {
          ...prev,
          word,
          lang,
          difficulty: state.difficulty,
          stability: state.stability,
          lastReview: state.lastReview,
          box: grade === 1 ? 1 : Math.min((prev?.box ?? 1) + (grade >= 3 ? 1 : 0), 5), // legacy для UI
          nextReviewAt: now + intervalDays * 24 * 60 * 60 * 1000,
          correctStreak: grade === 1 ? 0 : (prev?.correctStreak ?? 0) + 1,
          correctCount: (prev?.correctCount ?? 0) + (grade >= 3 ? 1 : 0),
          wrongCount: (prev?.wrongCount ?? 0) + (grade === 1 ? 1 : 0),
          lastSeenAt: now,
        };
        // джерело істини — БД; знімок у пам'яті оновлюється для рендеру
        fsrsDb.upsertProgress(next);
        return { progress: { ...s.progress, [k]: next } };
      }),
    dueWords: (entries, now = Date.now(), opts) =>
      entries
        .filter((e) => !opts?.bookId || e.bookId === opts.bookId)
        .map((e) => get().progress[keyOf(e.word, e.lang)] as TrainingProgress | undefined)
        .filter((p): p is TrainingProgress => {
          if (!p) return false;
          if (opts?.excludeLearned && p.box >= 4) return false; // legacy-фільтр вивчених
          return p.nextReviewAt <= now;
        })
        .sort((a, b) => {
          const ra = retrievability(a, now);
          const rb = retrievability(b, now);
          return ra - rb;
        }),
    levelOf: (word, lang) => {
      const p = get().progress[keyOf(word, lang)];
      if (!p) return 'new';
      if ((p.stability ?? 0) >= 21) return 'learned'; // ~3 тижні стабільності
      return 'learning';
    },
    urgencyOf: (word, lang) => {
      const p = get().progress[keyOf(word, lang)];
      if (!p) return 0; // нові слова — найвищий пріоритет
      return retrievability(p);
    },
  }),
  {
    name: 'bookreader-training',
    partialize: () => ({}), // дані в БД, AsyncStorage не використовується
    onRehydrateStorage: () => () => {
      try {
        useTrainingStore.getState().reload();
      } catch (e) {
        console.warn('[trainingStore] initial reload failed:', e);
      }
    },
  },
);
