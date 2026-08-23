// store/dictionaryStore.ts
// Локальный словарь: слово + контекст (предложение) + язык + дата.
// Ключ уникальности — word|lang. Дубликаты при добавлении/импорте отсекаются.
// Для счётчика в UI используйте entries (уже дедуплицированы в селекторах).
import { persist } from './createStore';
import { translateCached } from '../services/translationService';
import { useSettingsStore } from './settingsStore';

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
          // C9: не додаємо слово якщо мова оригіналу == мова перекладу (дубль-переклад на ту ж мову).
          const targetLang = useSettingsStore.getState().targetLang;
          if (newEntry.lang === targetLang) {
            return {}; // ігноруємо (не додаємо в словник)
          }
          // підгружаємо translation, якщо пусте (fire-and-forget) — щоб тренування бачило слово
          if (!newEntry.translation || !newEntry.translation.trim()) {
            const from = newEntry.lang || 'en';
            const to = targetLang || 'uk';
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
          // Map за ключем word|lang замість find() у циклі: 200к слів = O(n), не O(n²).
          const byKey = new Map<string, DictionaryEntry>();
          for (const e of s.entries) byKey.set(keyOf(e.word, e.lang), e);
          const now = Date.now();
          for (const item of list) {
            if (!item?.word) continue;
            const k = keyOf(item.word, item.lang);
            const existing = byKey.get(k);
            if (existing) {
              // дедуп: суммируем частоту, не дублируем (мутуємо копію в мапі)
              byKey.set(k, { ...existing, frequency: (existing.frequency ?? 1) + (item.frequency ?? 1) });
              continue;
            }
            byKey.set(k, { ...item, id: `${item.word}-${now}-${byKey.size}`, createdAt: now });
          }
          return { entries: Array.from(byKey.values()) };
        }),
      hasWord: (word) => {
        const w = word.trim().toLowerCase();
        return get().entries.some((e) => e.word.toLowerCase() === w);
      },
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


