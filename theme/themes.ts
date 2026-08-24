// theme/themes.ts
// Две темы оформления ридера (День / Ночь) в неоморфическом стиле.
// Неоморфизм = элементы того же цвета, что фон, с двойной тенью (светлая сверху-слева,
// тёмная снизу-справа), создающей эффект выдавленной/утопленной поверхности.
//
// Требования к палитрам:
//  - День: тёплая бумага, максимально мягкая для глаз (низкий контраст, без голубого).
//  - Ночь: глубокий графит (НЕ чистый чёрный — не выбивает из палитры), приглушённый текст.

export type ThemeMode = 'day' | 'night' | 'blackout';

export interface NeuColors {
  base: string; // цвет самого элемента (== цвет фона под ним → true extrusion)
  light: string; // блик (верх-лево)
  dark: string; // тень (низ-право)
  shadowDark: string; // мягкая внешняя тень (низ-право) — для boxShadow
  shadowLight: string; // мягкий внешний блик (верх-лево)
  soft: string; // цветной объём (от light) — видимый на тёмном фоне
  hi: string; // тонкий белый верхний хайлайт
  glow: string; // мягкое свечение снизу (делает объём читаемым)
}

/**
 * Незалежні налаштування геометрії тіней ДЛЯ КОЖНОЇ ТЕМИ.
 * metal() множить базові офсети/блюри на ці коефіцієнти — зміна day
 * ніколи не впливає на night і навпаки. Нова тема = свій NeuScale.
 *   depth  — глибина (сила) тіней: більше = виразніший рельєф
 *   spread — розліт тіні від елемента: менше = компактніші, "щільніші" тіні
 */
export interface NeuScale {
  depth: number;
  spread: number;
}

export interface ThemePalette {
  flat?: boolean; // FLAT-режим (blackout): без неоморфізму — текст+бордер кольору тексту
  // Приложение (табы, карточки, кнопки)
  background: string;
  surface: string; // база неоморфических карточек
  primary: string;
  primaryText: string;
  onPrimary: string; // колір тексту/іконки ПОВЕРХ primary-заливки (контраст до primary)
  secondaryText: string;
  border: string;
  selected: string;
  success: string;
  danger: string;
  backdrop: string; // затемнення фону модалок/оверлеїв (централізоване, п.9)
  // Ридер (область текста книги)
  readerBg: string;
  readerText: string;
  readerDim: string; // затемнение неактивного текста при параллельном переводе
  highlight: string; // подсветка выбранного слова
  popupBg: string; // фон словарного попапа
  popupBorder: string;
  posColor: string; // цвет части речи (сущ./гл.) — в примере синий
  // Градиент фона приложения (премиум-глубина): сверху-центр светлее → края темнее
  bgTop: string;
  bgBot: string;
  // Неоморфические тени для текущей темы
  neu: NeuColors;
  /** Геометрія тіней цієї теми (незалежна від інших тем). */
  neuScale: NeuScale;
}

export const THEMES: Record<ThemeMode, ThemePalette> = {
  // ---- ДЕНЬ: максимально мягкая тёплая бумага, тёплый бурштын-акцент (аналоговая гармония) ----
  day: {
    background: '#EAD9BE',
    surface: '#EAD9BE',
    primary: '#C98A4B', // м'якший теплий карамельний акцент (гармоніює з паперовою палітрою)
    onPrimary: '#FBF4E4', // кремовий знак/текст ПОВЕРХ карамельної заливки
    primaryText: '#3F3526', // темніше за попереднє (#4A3F2E) — читабельність на світлому бежі
    secondaryText: '#96805B', // трохи темніше — межі навігації не розмиваються
    border: '#CBB891', // темніший бордер — обвід елементів видно чітко (було #D8C7A6, зливався)
    selected: '#DFCDAC',
    success: '#16A34A',
    danger: '#DC2626',
    backdrop: 'rgba(0,0,0,0.45)',
    readerBg: '#F2E6CE',
    readerText: '#4A3F2E',
    readerDim: '#B7A684',
    highlight: '#D99A3E',
    popupBg: '#EAD9BE',
    popupBorder: '#D8C7A6',
    posColor: '#B5742E',
    bgTop: '#F2E6CE',
    bgBot: '#E0CFA8',
    neu: { base: '#EAD9BE', light: '#FCF3DF', dark: '#B5A179', shadowDark: 'rgba(150,130,95,0.6)', shadowLight: 'rgba(255,255,255,0.85)', soft: 'rgba(248,238,217,0.7)', hi: 'rgba(255,255,255,0.55)', glow: 'rgba(255,250,238,0.5)' },
    // День: м'які, щільні тіні — на світлому бежі глибина читається і без розльоту
    neuScale: { depth: 0.9, spread: 0.8 },
  },
  // ---- НОЧЬ: графіт + світло-сталевий акцент (холодна палітра, без "брудних" теплих сірих) ----
  night: {
    background: '#16171A',
    surface: '#1C1D21',
    primary: '#8FA3B8', // світла сталь — холодний акцент, читається на графіті
    onPrimary: '#101216', // темний текст/знак на світлій сталі (контраст)
    primaryText: '#E4E7EB', // холодний ivory, без теплих відтінків
    secondaryText: '#8B929B', // холодний сіро-блакитний, не брудний
    border: '#2A2C31',
    selected: '#2E3844', // холодний підсвічений вибір
    success: '#22C55E',
    danger: '#EF4444',
    backdrop: 'rgba(0,0,0,0.6)',
    readerBg: '#16171A',
    readerText: '#DFE3E8',
    readerDim: '#6A6E75',
    highlight: '#AFC2D6', // сталева підсвітка слова
    popupBg: '#1C1D21',
    popupBorder: '#2E3844',
    posColor: '#AFC2D6',
    bgTop: '#212229',
    bgBot: '#0C0D0F',
    neu: { base: '#1A1B1F', light: '#3A4450', dark: '#0B0C0E', shadowDark: 'rgba(0,0,0,0.55)', shadowLight: 'rgba(160,180,200,0.09)', soft: 'rgba(80,95,110,0.5)', hi: 'rgba(200,215,230,0.08)', glow: 'rgba(120,140,160,0.3)' },
    // Ніч: глибші тіні з більшим розльотом — на темному графіті потрібен контраст
    neuScale: { depth: 1.15, spread: 1.0 },
  },
  // ---- BLACKOUT: максимально чёрный фон для OLED (пиксели полностью выключаются) ----
  // Никакого белого: текст и кнопки — светло-серые. Неоморфизм на чёрном не виден,
  // поэтому base делаем светло-серым (#1C1C1E) для видимости кнопок (хрестик удаления и т.п.).
  blackout: {
    flat: true, // FLAT-режим: без неоморфізму (rollback: git tag blackout-before-flat)
    background: '#000000',
    surface: '#050505',
    primary: '#232427',
    onPrimary: '#B8B2A6', // світлий текст на темній primary-заливці (FLAT blackout)
    primaryText: '#787468', // тьмяний сірий (НЕ світло-сірий, НЕ білий)
    secondaryText: '#56524C',
    border: '#161616',
    selected: '#0E0E0E',
    success: '#22C55E',
    danger: '#EF4444',
    backdrop: 'rgba(0,0,0,0.75)',
    readerBg: '#000000',
    readerText: '#726E64', // тьмяний сірий (НЕ білий)
    readerDim: '#3C3C40',
    highlight: '#787468', // тьмяний сірий
    popupBg: '#0A0A0A',
    popupBorder: '#161616',
    posColor: '#787468', // тьмяний сірий
    bgTop: '#050505',
    bgBot: '#000000',
    neu: { base: '#1A1A1C', light: '#242427', dark: '#000000', shadowDark: 'rgba(0,0,0,0.9)', shadowLight: 'rgba(255,255,255,0.04)', soft: 'rgba(60,58,54,0.5)', hi: 'rgba(255,245,220,0.04)', glow: 'rgba(100,92,68,0.25)' },
    // Blackout — FLAT (неоморфізм вимкнено), scale не використовується, але поле обов'язкове
    neuScale: { depth: 1, spread: 1 },
  },
};

export const THEME_ORDER: ThemeMode[] = ['day', 'night', 'blackout'];
// Ключи для i18n (английский = fallback). В UI оборачивается в t().
export const THEME_LABELS: Record<ThemeMode, string> = {
  day: 'Day',
  night: 'Night',
  blackout: 'Blackout',
};
