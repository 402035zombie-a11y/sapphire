/**
 * appStore.ts — централізований zustand-стор (E2).
 * ОДИН стор замість розмитого стану по екранах (фікс ре-рендерів).
 * Персист у MMKV (швидкий KV для налаштувань/прогресу).
 *
 * НЕ видаляє існуючі store/*.ts — це новий центральний стор; міграція екранів поетапна (E4+).
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ReaderTheme = 'light' | 'dark' | 'sepia';
export type SourceLang = string;
export type TargetLang = string;

export interface AppState {
  // мови (дефолт EN→UA)
  sourceLang: SourceLang;
  targetLang: TargetLang;
  setLangs: (source: SourceLang, target: TargetLang) => void;

  // тема/шрифт
  theme: ReaderTheme;
  fontSize: number;
  setTheme: (t: ReaderTheme) => void;
  setFontSize: (n: number) => void;

  // прогрес читання per book (швидке відновлення при повторному відкритті)
  readingProgress: Record<string, { chapterIdx: number; position: number }>;
  setProgress: (bookId: string, chapterIdx: number, position: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sourceLang: 'en',
      targetLang: 'uk',
      setLangs: (source, target) => set({ sourceLang: source, targetLang: target }),

      theme: 'light',
      fontSize: 18,
      setTheme: (t) => set({ theme: t }),
      setFontSize: (n) => set({ fontSize: n }),

      readingProgress: {},
      setProgress: (bookId, chapterIdx, position) =>
        set((s) => ({
          readingProgress: { ...s.readingProgress, [bookId]: { chapterIdx, position } },
        })),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
