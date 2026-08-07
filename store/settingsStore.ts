// store/settingsStore.ts
// Настройки перевода: целевой язык, бэкенд и пользовательский API-ключ.
// Это и есть реализация сценария «пользователь тратит свой лимит» — он вводит свой ключ.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureTranslation, TranslationBackend } from '../services/translationService';

export type AppTheme = 'system' | 'light' | 'dark';

interface SettingsState {
  targetLang: string; // на какой язык переводим (по умолчанию язык системы/ru)
  backend: TranslationBackend;
  apiKey: string;
  theme: AppTheme;
  apply: () => void; // применяет backend+key к translationService
  setTargetLang: (l: string) => void;
  setBackend: (b: TranslationBackend) => void;
  setApiKey: (k: string) => void;
  setTheme: (t: AppTheme) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      targetLang: 'ru',
      backend: 'googleGtx',
      apiKey: '',
      theme: 'system',
      apply: () => {
        const { backend, apiKey } = get();
        configureTranslation(backend, apiKey || undefined);
      },
      setTargetLang: (l) => set({ targetLang: l }),
      setBackend: (b) => {
        set({ backend: b });
        get().apply();
      },
      setApiKey: (k) => {
        set({ apiKey: k });
        get().apply();
      },
      setTheme: (t) => set({ theme: t }),
    }),
    {
      name: 'bookreader-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // при старте применяем сохранённый бэкенд/ключ
        state?.apply();
      },
    },
  ),
);
