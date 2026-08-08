// store/dictionaryStore.ts
// Локальный словарь: слово + контекст (предложение) + язык + дата.
import { persist } from './createStore';

export interface DictionaryEntry {
  id: string;
  word: string;
  surfaceForm: string;
  translation: string;
  context: string;
  lang: string;
  bookId?: string;
  createdAt: number;
}

interface DictionaryState {
  entries: DictionaryEntry[];
  addEntry: (entry: Omit<DictionaryEntry, 'id' | 'createdAt'>) => void;
  removeEntry: (id: string) => void;
  hasWord: (word: string) => boolean;
}

export const useDictionaryStore = persist<DictionaryState>(
  (set, get) => ({
    entries: [],
    addEntry: (entry) =>
      set((s) =>
        s.entries.some((e) => e.word === entry.word && e.lang === entry.lang)
          ? s
          : {
              entries: [
                ...s.entries,
                { ...entry, id: `${entry.word}-${Date.now()}`, createdAt: Date.now() },
              ],
            },
      ),
    removeEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
    hasWord: (word) => get().entries.some((e) => e.word === word),
  }),
  { name: 'bookreader-dictionary' },
);
