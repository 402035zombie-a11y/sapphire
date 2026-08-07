// store/libraryStore.ts
// Хранилище загруженных книг. persist → AsyncStorage.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type BookFormat = 'epub' | 'txt';

export interface BookParagraph {
  index: number;
  original: string; // исходное предложение/абзац
  translation?: string; // параллельный перевод (заполняется при чтении)
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  format: BookFormat;
  // для .txt храним текст целиком; для .epub — путь к распакованному/исходному файлу
  uri: string;
  language: string; // исходный язык книги (ISO)
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

export const useLibraryStore = create<LibraryState>()(
  persist(
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
    {
      name: 'bookreader-library',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
