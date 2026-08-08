// store/libraryStore.ts
// Хранилище загруженных книг. persist → AsyncStorage.
import { persist } from './createStore';

export type BookFormat = 'epub' | 'txt';

export interface BookParagraph {
  index: number;
  original: string;
  translation?: string;
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  format: BookFormat;
  uri: string;
  language: string;
  paragraphs: BookParagraph[];
  createdAt: number;
}

interface LibraryState {
  books: Book[];
  addBook: (book: Book) => void;
  removeBook: (id: string) => void;
  updateParagraphTranslation: (bookId: string, paragraphIndex: number, translation: string) => void;
  getBook: (id: string) => Book | undefined;
}

export const useLibraryStore = persist<LibraryState>(
  (set, get) => ({
    books: [],
    addBook: (book) => set((s) => ({ books: [...s.books, book] })),
    removeBook: (id) => set((s) => ({ books: s.books.filter((b) => b.id !== id) })),
    updateParagraphTranslation: (bookId, paragraphIndex, translation) =>
      set((s) => ({
        books: s.books.map((b) =>
          b.id === bookId
            ? {
                ...b,
                paragraphs: b.paragraphs.map((p) =>
                  p.index === paragraphIndex ? { ...p, translation } : p,
                ),
              }
            : b,
        ),
      })),
    getBook: (id) => get().books.find((b) => b.id === id),
  }),
  { name: 'bookreader-library' },
);
