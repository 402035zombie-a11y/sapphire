// theme/themes.ts
// Две темы оформления ридера (День / Ночь) в неоморфическом стиле.
// Неоморфизм = элементы того же цвета, что фон, с двойной тенью (светлая сверху-слева,
// тёмная снизу-справа), создающей эффект выдавленной/утопленной поверхности.
//
// Требования к палитрам:
//  - День: тёплая бумага, максимально мягкая для глаз (низкий контраст, без голубого).
//  - Ночь: глубокий графит (НЕ чистый чёрный — не выбивает из палитры), приглушённый текст.

export type ThemeMode = 'day' | 'night';

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

export interface ThemePalette {
  // Приложение (табы, карточки, кнопки)
  background: string;
  surface: string; // база неоморфических карточек
  primary: string;
  primaryText: string;
  secondaryText: string;
  border: string;
  selected: string;
  success: string;
  danger: string;
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
}

export const THEMES: Record<ThemeMode, ThemePalette> = {
  // ---- ДЕНЬ: максимально мягкая тёплая бумага, тёплый бурштын-акцент (аналоговая гармония) ----
  day: {
    background: '#EAD9BE',
    surface: '#EAD9BE',
    primary: '#B5742E',
    primaryText: '#4A3F2E',
    secondaryText: '#8C7A5E',
    border: '#D8C7A6',
    selected: '#DFCDAC',
    success: '#6E8A4E',
    danger: '#B5583C',
    readerBg: '#F2E6CE',
    readerText: '#4A3F2E',
    readerDim: '#B7A684',
    highlight: '#D99A3E',
    popupBg: '#EAD9BE',
    popupBorder: '#D8C7A6',
    posColor: '#B5742E',
    bgTop: '#F2E6CE',
    bgBot: '#E0CFA8',
    neu: { base: '#EAD9BE', light: '#FBF1DC', dark: '#BCA982', shadowDark: 'rgba(158,139,103,0.55)', shadowLight: 'rgba(255,255,255,0.7)', soft: 'rgba(248,238,217,0.7)', hi: 'rgba(255,255,255,0.5)', glow: 'rgba(255,250,238,0.5)' },
  },
  // ---- НОЧЬ: розкішний onyx-графіт + золото (bagatstvo/roskish), ivory-текст ----
  night: {
    background: '#16171A',
    surface: '#1C1D21',
    primary: '#F2EEE6',
    primaryText: '#ECE7DB',
    secondaryText: '#9A958A',
    border: '#2A2B30',
    selected: '#232429',
    success: '#5E8C6A',
    danger: '#B04646',
    readerBg: '#16171A',
    readerText: '#E4DFD2',
    readerDim: '#6A6A70',
    highlight: '#F2EEE6',
    popupBg: '#1C1D21',
    popupBorder: '#2A2B30',
    posColor: '#F2EEE6',
    bgTop: '#212229',
    bgBot: '#0C0D0F',
    neu: { base: '#1A1B1F', light: '#34353B', dark: '#0B0C0E', shadowDark: 'rgba(0,0,0,0.55)', shadowLight: 'rgba(255,240,200,0.06)', soft: 'rgba(90,88,80,0.5)', hi: 'rgba(255,245,220,0.06)', glow: 'rgba(150,140,100,0.35)' },
  },
};

export const THEME_ORDER: ThemeMode[] = ['day', 'night'];
// Ключи для i18n (английский = fallback). В UI оборачивается в t().
export const THEME_LABELS: Record<ThemeMode, string> = {
  day: 'Day',
  night: 'Night',
};
