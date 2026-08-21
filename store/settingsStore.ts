// store/settingsStore.ts
// Настройки перевода (только язык) + тема оформления (День/Ночь).
// Поставщик перевода всегда бесплатный Google GTX (без ключа) — выбор убран.
import { persist } from './createStore';
import { ThemeMode } from '../theme/themes';

interface SettingsState {
  appLang: string; // язык интерфейса приложения (ISO 639-1), дефолт 'en'
  targetLang: string; // язык перевода книг по умолчанию
  theme: ThemeMode;
  reader: {
    fontSize: number;
    lineHeight: number; // множитель межстрочного интервала
    paragraphSpacing: number; // відступ між абзацами (px), 0 = за замовчуванням
    margin: number;
    justify: boolean;
    fontFamily: string; // гарнитура: 'default' | 'serif' | 'sans' | 'mono'
    fontWeight: number; // 300..800 — жирность
    textAlign: 'left' | 'justify' | 'hyphenation';
    letterSpacing: number; // відступ між літерами (px), 0 = за замовчуванням
    pageMargins: boolean; // вкл/выкл отступы по краям
    highlightWords: boolean;
    dictionaryOnDoubleTap: boolean;
    showAllTranslations: boolean; // показывать перевод под каждым абзацем сразу
    microPauses: boolean; // микропаузы после знаков препинания в скорочтении
    pauseCommaMs: number; // пауза после запятой/точки-с-запятой/двоеточия/тире (0..1000, шаг 10)
    pauseSentMs: number; // пауза после конца предложения (.!?…) (0..1000, шаг 10)
    pauseBracketMs: number; // пауза у скобок (0..1000, шаг 10)
    showSpeakButton: boolean; // показывать кнопку озвучки (▶) у абзаца
    showTranslateButton: boolean; // показывать кнопку «Перевести» (⇄) у абзаца
  };
  setTargetLang: (l: string) => void;
  setAppLang: (l: string) => void;
  setTheme: (t: ThemeMode) => void;
  setReader: (patch: Partial<SettingsState['reader']>) => void;
}

export const useSettingsStore = persist<SettingsState>(
  (set) => ({
    appLang: 'auto', // дефолт интерфейса — авто (по системе; ru→en), можно сменить в настройках
    targetLang: 'uk', // дефолт перевода — украинский (по требованию юзера)
    // По умолчанию — тёмная тема (Ночь), как просил пользователь.
    theme: 'night',
    reader: {
      fontSize: 18,
      lineHeight: 1.4,
      paragraphSpacing: 0,
      margin: 0,
      justify: true,
      fontFamily: 'default',
      fontWeight: 400,
      textAlign: 'justify',
      letterSpacing: 0,
      pageMargins: false,
      highlightWords: true,
      dictionaryOnDoubleTap: true,
      showAllTranslations: false,
      microPauses: true,
      pauseCommaMs: 400, // пауза после запятой/точки-с-запятой/двоеточия/тире
      pauseSentMs: 400, // пауза после конца предложения
      pauseBracketMs: 400, // пауза у скобок (открывающая — на слове после, закрывающая — на слове перед)
      showSpeakButton: true,
      showTranslateButton: true,
    },
    setTargetLang: (l) => set({ targetLang: l }),
    setAppLang: (l) => set({ appLang: l }),
    setTheme: (t) => set({ theme: t }),
    setReader: (patch) => set((s) => ({ reader: { ...s.reader, ...patch } })),
  }),
  {
    name: 'bookreader-settings',
    partialize: (s) => ({
      targetLang: s.targetLang,
      theme: s.theme,
      reader: s.reader,
    }),
  },
);
