// store/dictionaryStore.ts
// Словник: дані в books.db (SQLite, services/dictDb.ts).
// Масив entries у пам'яті = знімок для рендеру; кожна мутація спочатку пишеться
// в БД (джерело істини), потім оновлює знімок. Перезапису всього JSON немає.
import { persist } from './createStore';
import { translateCached } from '../services/translationService';
import { useSettingsStore } from './settingsStore';
import * as dictDb from '../services/dictDb';

export interface DictionaryEntry {
  id: string;
  word: string;
  surfaceForm: string;
  translation: string;
  context: string;
  lang: string;
  bookId?: string;
  frequency?: number;
  createdAt: number;
}

const rowToEntry = (r: dictDb.DictRow): DictionaryEntry => ({
  id: String(r.id),
  word: r.word,
  surfaceForm: r.surfaceForm,
  translation: r.translation,
  context: r.context,
  lang: r.lang,
  bookId: r.bookId,
  frequency: r.frequency,
  createdAt: r.createdAt,
});

interface DictionaryState {
  entries: DictionaryEntry[];
  /** Перезавантажити знімок із БД (після batch-імпортів / на старті екрана). */
  reload: () => void;
  addEntry: (entry: Omit<DictionaryEntry, 'id' | 'createdAt'>) => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, patch: Partial<Pick<DictionaryEntry, 'translation' | 'context'>>) => void;
  importEntries: (list: Omit<DictionaryEntry, 'id' | 'createdAt'>[]) => void;
  hasWord: (word: string) => boolean;
  clearAll: () => void;
  clearByBook: (bookId: string) => void;
}

function keyOf(word: string, lang: string): string {
  return `${word.trim().toLowerCase()}|${lang}`;
}

export const useDictionaryStore = persist<DictionaryState>(
  (set, get) => ({
    entries: [],
    reload: () => set(() => ({ entries: dictDb.getAllEntries().map(rowToEntry) })),
    addEntry: (entry) =>
      set((s) => {
        // C9: не додаємо слово якщо мова оригіналу == цільова (дубль-переклад на ту ж мову)
        const targetLang = useSettingsStore.getState().targetLang;
        if (entry.lang === targetLang) return {};
        const res = dictDb.insertEntry(entry);
        if (res.merged) {
          // дедуп: слово вже є — оновлюємо частоту в знімку
          const key = keyOf(entry.word, entry.lang);
          return {
            entries: s.entries.map((e) =>
              keyOf(e.word, e.lang) === key ? { ...e, frequency: (e.frequency ?? 1) + (entry.frequency ?? 1) } : e
            ),
          };
        }
        const newEntry: DictionaryEntry = {
          ...entry,
          id: String(res.id),
          createdAt: Date.now(),
        };
      // підгружаємо переклад, якщо пустий (fire-and-forget) — щоб тренування бачило слово
      if (!newEntry.translation || !newEntry.translation.trim()) {
        const from = newEntry.lang || 'en';
        const to = targetLang || 'uk';
        translateCached(newEntry.word, from, to)
          .then((r) => {
            if (r?.text && r.text.trim().toLowerCase() !== newEntry.word.trim().toLowerCase()) {
              dictDb.updateTranslation(res.id, { translation: r.text });
              get().reload();
            }
          })
          .catch(() => {});
      }
        return { entries: [newEntry, ...s.entries] };
      }),
    removeEntry: (id) =>
      set((s) => {
        dictDb.deleteEntry(Number(id));
        return { entries: s.entries.filter((e) => e.id !== id) };
      }),
    updateEntry: (id, patch) =>
      set((s) => {
        dictDb.updateTranslation(Number(id), patch);
        return { entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) };
      }),
    importEntries: (list) =>
      set((s) => {
        // Батч-INSERT однією транзакцією; знімок перечитується повністю
        // (при десятках тисяч слів дешевше одного reload-пасу все одно).
        dictDb.importEntriesBatch(list);
        return { entries: dictDb.getAllEntries().map(rowToEntry) };
      }),
    hasWord: (word) => dictDb.hasEntry(word),
    clearAll: () =>
      set(() => {
        dictDb.clearAll();
        return { entries: [] };
      }),
    clearByBook: (bookId) =>
      set((s) => {
        dictDb.clearByBook(bookId);
        return { entries: s.entries.filter((e) => e.bookId !== bookId) };
      }),
  }),
  {
    name: 'sapphire-dictionary',
    legacyName: 'bookreader-dictionary',
    partialize: () => ({}), // НІЧОГО не серіалізуємо в AsyncStorage — дані в БД
    onRehydrateStorage: () => () => {
      // старт екрана: підтягнути знімок із БД (async-safe)
      try {
        useDictionaryStore.getState().reload();
      } catch (e) {
        console.warn('[dictionaryStore] initial reload failed:', e);
      }
    },
  },
);
