// store/settingsStore.ts
// Настройки перевода: целевой язык, бэкенд и пользовательский API-ключ.
import { persist } from './createStore';
import { configureTranslation, TranslationBackend } from '../services/translationService';

export type AppTheme = 'system' | 'light' | 'dark';

interface SettingsState {
  targetLang: string;
  backend: TranslationBackend;
  apiKey: string;
  theme: AppTheme;
  apply: () => void;
  setTargetLang: (l: string) => void;
  setBackend: (b: TranslationBackend) => void;
  setApiKey: (k: string) => void;
  setTheme: (t: AppTheme) => void;
}

export const useSettingsStore = persist<SettingsState>(
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
    partialize: (s) => ({ targetLang: s.targetLang, backend: s.backend, apiKey: s.apiKey, theme: s.theme }),
  },
);

// применяем сохранённый бэкенд при старте
useSettingsStore.getState().apply();
