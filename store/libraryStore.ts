// store/libraryStore.ts
// Хранилище загруженных книг. persist → AsyncStorage.
import { persist } from './createStore';

export type BookFormat = 'epub' | 'txt' | 'fb2' | 'pdf';

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
  createdAt: number;
  progress: number; // 0..1
  lastPosition: number; // индекс последнего прочитанного абзаца
  bookmarks: number[]; // индексы закладок
}

interface LibraryState {
  books: Book[];
  addBook: (book: Book) => void;
  removeBook: (id: string) => void;
  updateParagraphTranslation: (bookId: string, paragraphIndex: number, translation: string) => void;
  updateParagraphsTranslations: (bookId: string, entries: { index: number; translation: string }[]) => void;
  setBookTargetLang: (bookId: string, targetLang: string) => void;
  setProgress: (bookId: string, progress: number, lastPosition: number) => void;
  toggleBookmark: (bookId: string, paragraphIndex: number) => void;
  getBook: (id: string) => Book | undefined;
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
    removeBook: (id) => set((s) => ({ books: s.books.filter((b) => b.id !== id) })),
    updateParagraphTranslation: (bookId, paragraphIndex, translation) =>
      set((s) => {
        const book = s.books.find((b) => b.id === bookId);
        if (book) {
          const p = book.paragraphs[paragraphIndex];
          if (p && p.translation !== translation) p.translation = translation;
        }
        return {};
      }),
    updateParagraphsTranslations: (bookId, entries: { index: number; translation: string }[]) =>
      set((s) => {
        const book = s.books.find((b) => b.id === bookId);
        if (book) {
          for (const e of entries) {
            const p = book.paragraphs[e.index];
            if (p) p.translation = e.translation;
          }
        }
        return {};
      }),
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
  }),
  {
    name: 'bookreader-library',
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

