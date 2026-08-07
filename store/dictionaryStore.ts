// store/dictionaryStore.ts
// Локальный словарь: слово + контекст (предложение) + язык + дата.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DictionaryEntry {
  id: string;
  word: string; // нормализованное слово (нижний регистр, без пунктуации)
  surfaceForm: string; // как встретилось в тексте (сохраняем регистр/форму)
  translation: string;
  context: string; // предложение-контекст
  lang: string; // ISO исходного языка
  bookId?: string;
  createdAt: number;
}

interface DictionaryState {
  entries: DictionaryEntry[];
  addEntry: (entry: Omit<DictionaryEntry, 'id' | 'createdAt'>) => void;
  removeEntry: (id: string) => void;
  hasWord: (word: string) => boolean;
}

export const useDictionaryStore = create<DictionaryState>()(
  persist(
    (set, get) => ({
      entries: [],
      addEntry: (entry) =>
        set((s) =>
          s.entries.some((e) => e.word === entry.word && e.lang === entry.lang)
            ? s // уже есть такое слово на этом языке — не дублируем
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
    {
      name: 'bookreader-dictionary',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
