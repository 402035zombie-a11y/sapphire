// store/libraryStore.ts
// Хранилище загруженных книг. persist → AsyncStorage.
import { persist } from './createStore';
import { deleteBookData } from '../services/bookText';

export type BookFormat = 'epub' | 'txt' | 'fb2' | 'pdf' | 'docx' | 'odt' | 'rtf' | 'html' | 'mobi' | 'zip';

export interface BookParagraph {
  index: number;
  original: string;
  translation?: string;
}

export interface BookSection {
  title: string;
  paragraphIndex: number;
}

const cleanTitleOf = (name: string) =>
  name.replace(/\.(txt|fb2|pdf|epub)$/i, '').replace(/[-_ ]\d{10,}$/, '');

export type BookStatus = 'parsing' | 'saving' | 'ready' | 'error';

export interface Book {
  id: string;
  title: string;
  author?: string;
  format: BookFormat;
  uri: string;
  pdfUri?: string; // для PDF: ссылка на файл для прямого просмотра
  language: string;
  targetLang: string;
  paragraphs: BookParagraph[];
  sections: BookSection[];
  coverImage?: string; // base64 data URI або file:// шлях до обкладинки
  sentenceTranslations?: Record<string, string>; // key: paragraphIndex*1000+sentenceIndex -> переклад речення
  createdAt: number;
  progress: number; // 0..1
  lastPosition: number; // индекс последнего прочитанного абзаца
  bookmarks: number[]; // индексы закладок
  // --- Import states ( Фаза 1 Web Worker ) ---
  status: BookStatus;           // стан імпорту: parsing | saving | ready | error
  importProgress: number;       // 0..100 відсоток прогресу парсингу/завантаження
  importError?: string;         // помилка, якщо status === 'error'
}

interface LibraryState {
  books: Book[];
  addBook: (book: Book) => void;
  removeBook: (id: string) => void;
  updateParagraphTranslation: (bookId: string, paragraphIndex: number, translation: string) => void;
  setBookTargetLang: (bookId: string, targetLang: string) => void;
  setProgress: (bookId: string, progress: number, lastPosition: number) => void;
  toggleBookmark: (bookId: string, paragraphIndex: number) => void;
  getBook: (id: string) => Book | undefined;
  updateSentenceTranslations?: (bookId: string, entries: { key: string; translation: string }[]) => void;
  // --- Import methods ( Фаза 1 Web Worker ) ---
  addBookPlaceholder: (book: Book) => void;          // створити картку зі status='parsing'
  updateImportProgress: (bookId: string, progress: number) => void; // оновити % парсингу
  finishBookImport: (bookId: string, data: Partial<Book>) => void; // парсинг OK → ready
  failBookImport: (bookId: string, error: string) => void; // помилка парсингу → error
  cancelBookImport: (bookId: string) => void;        // скасування → видалити картку
}

export const useLibraryStore = persist<LibraryState>(
  (set, get) => ({
    books: [],
    addBook: (book) => set((s) => {
      const exists = s.books.some((b) => b.id === book.id);
      return {
        books: exists
          ? s.books.map((b) => (b.id === book.id ? { ...b, ...book } : b))
          : [...s.books, book],
      };
    }),
    removeBook: (id) => set((s) => {
      // Повне прибирання: текст глав + переклади речень у books.db теж видаляються,
      // інакше вони лишаються назавжди (витік місця).
      try {
        deleteBookData(id);
      } catch (e) {
        console.warn('[libraryStore] deleteBookData failed:', e);
      }
      return { books: s.books.filter((b) => b.id !== id) };
    }),
    updateParagraphTranslation: (bookId, paragraphIndex, translation) =>
      set((s) => {
        const book = s.books.find((b) => b.id === bookId);
        if (book) {
          const p = book.paragraphs[paragraphIndex];
          if (p && p.translation !== translation) p.translation = translation;
        }
        return {};
      }),
    // updateSentenceTranslations видалено: переклади речень тепер у books.db
    // (services/sentenceTranslationsDb.ts), не в JSON стора.
    getBook: (id) => get().books.find((b) => b.id === id),
    setBookTargetLang: (bookId, targetLang) =>
      set((s) => {
        const book = s.books.find((b) => b.id === bookId);
        if (book) book.targetLang = targetLang;
        return {};
      }),
    setProgress: (bookId, progress, lastPosition) =>
      set((s) => {
        const book = s.books.find((b) => b.id === bookId);
        if (book) {
          book.progress = Math.min(1, Math.max(0, progress));
          book.lastPosition = lastPosition;
        }
        return {};
      }),
    toggleBookmark: (bookId, paragraphIndex) =>
          set((s) => {
            const book = s.books.find((b) => b.id === bookId);
            if (book) {
              const has = book.bookmarks.includes(paragraphIndex);
              if (has) book.bookmarks = book.bookmarks.filter((i) => i !== paragraphIndex);
              else book.bookmarks = [...book.bookmarks, paragraphIndex];
            }
            return {};
          }),

        // --- Import methods ( Фаза 1 Web Worker ) ---
        addBookPlaceholder: (book) =>
          set((s) => {
            const exists = s.books.some((b) => b.id === book.id);
            return {
              books: exists
                ? s.books.map((b) => (b.id === book.id ? { ...b, ...book } : b))
                : [...s.books, book],
            };
          }),
        updateImportProgress: (bookId, progress) =>
          set((s) => {
            const book = s.books.find((b) => b.id === bookId);
            if (book) {
              book.importProgress = Math.min(100, Math.max(0, progress));
              book.status = 'parsing';
            }
            return {};
          }),
        finishBookImport: (bookId, data) =>
          set((s) => {
            const book = s.books.find((b) => b.id === bookId);
            if (book) {
              Object.assign(book, data, {
                status: 'ready',
                importProgress: 100,
                importError: undefined,
              });
            }
            return {};
          }),
        failBookImport: (bookId, error) =>
          set((s) => {
            const book = s.books.find((b) => b.id === bookId);
            if (book) {
              book.status = 'error';
              book.importError = error;
            }
            return {};
          }),
        cancelBookImport: (bookId) =>
          set((s) => ({
            books: s.books.filter((b) => b.id !== bookId),
          })),
  }),
  {
    name: 'sapphire-library',
    legacyName: 'bookreader-library',
    onRehydrateStorage: () => (state) => {
      if (!state?.books?.length) return;
      // НЕ схлопываем книги по названию: id уникален (makeBookId добавляет timestamp-суффикс).
      // Только очищаем заголовок от расширения/старых суффиксов, если нужно.
      for (const b of state.books) {
        const cleaned = cleanTitleOf(b.title || b.id);
        if (cleaned && cleaned !== b.title) b.title = cleaned;
      }
    },
  },
);


