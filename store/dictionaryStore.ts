// store/dictionaryStore.ts
// Локальный словарь: слово + контекст (предложение) + язык + дата.
// Ключ уникальности — word|lang. Дубликаты при добавлении/импорте отсекаются.
// Для счётчика в UI используйте entries (уже дедуплицированы в селекторах).
import { persist } from './createStore';
import { translateCached } from '../services/translationService';

export interface DictionaryEntry {
  id: string;
  word: string;
  surfaceForm: string;
  translation: string;
  context: string;
  lang: string;
  bookId?: string;
  frequency?: number; // сколько раз слово встретилось в книге (растёт при дедупе)
  createdAt: number;
}

interface DictionaryState {
  entries: DictionaryEntry[];
  addEntry: (entry: Omit<DictionaryEntry, 'id' | 'createdAt'>) => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, patch: Partial<Pick<DictionaryEntry, 'translation' | 'context'>>) => void;
  importEntries: (list: Omit<DictionaryEntry, 'id' | 'createdAt'>[]) => void;
  hasWord: (word: string) => boolean;
  clearAll: () => void;
  clearByBook: (bookId: string) => void;
}

// нормализация ключа (как в addEntry)
function keyOf(word: string, lang: string): string {
  return `${word.trim().toLowerCase()}|${lang}`;
}

export const useDictionaryStore = persist<DictionaryState>(
  (set, get) => {
    // при загрузке из сторадж убираем возможные дубли (по word|lang)
    return {
      entries: [],
      addEntry: (entry) =>
        set((s) => {
          const key = keyOf(entry.word, entry.lang);
          const existing = s.entries.find((e) => keyOf(e.word, e.lang) === key);
          if (existing) {
            // дедуп: карточка не дублируется, но частота растёт
            return {
              entries: s.entries.map((e) =>
                e === existing
                  ? { ...e, frequency: (e.frequency ?? 1) + (entry.frequency ?? 1) }
                  : e,
              ),
            };
          }
          const id = `${entry.word}-${Date.now()}`;
          const newEntry = { ...entry, id, createdAt: Date.now() };
          // подгружаем translation, если пустой (fire-and-forget) — чтобы тренировка видела слово
          if (!newEntry.translation || !newEntry.translation.trim()) {
            const from = newEntry.lang || 'en';
            const to = newEntry.lang === 'en' ? 'ru' : 'en';
            translateCached(newEntry.word, from, to)
              .then((r) => { if (r?.text) get().updateEntry(id, { translation: r.text }); })
              .catch(() => {});
          }
          return { entries: [...s.entries, newEntry] };
        }),
      removeEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      updateEntry: (id, patch) =>
        set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      importEntries: (list) =>
        set((s) => {
          const seen = new Set(s.entries.map((e) => keyOf(e.word, e.lang)));
          const merged = [...s.entries];
          for (const item of list) {
            const k = keyOf(item.word, item.lang);
            const existing = merged.find((e) => keyOf(e.word, e.lang) === k);
            if (existing) {
              // дедуп: суммируем частоту, не дублируем
              existing.frequency = (existing.frequency ?? 1) + (item.frequency ?? 1);
              continue;
            }
            if (seen.has(k)) continue;
            seen.add(k);
            merged.push({ ...item, id: `${item.word}-${Date.now()}-${merged.length}`, createdAt: Date.now() });
          }
          return { entries: merged };
        }),
      hasWord: (word) => get().entries.some((e) => e.word.toLowerCase() === word.trim().toLowerCase()),
      clearAll: () => set({ entries: [] }),
      clearByBook: (bookId) => set((s) => ({ entries: s.entries.filter((e) => e.bookId !== bookId) })),
    } as DictionaryState;
  },
  {
    name: 'bookreader-dictionary',
    onRehydrateStorage: () => (state) => {
      if (!state?.entries?.length) return;
      // Чистим bookId от timestamp-суффикса (старые записи ссылались на дубли книг)
      for (const e of state.entries) {
        if (e.bookId) e.bookId = e.bookId.replace(/[-_ ]\d{10,}$/, '');
      }
    },
  },
);