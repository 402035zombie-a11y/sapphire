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
  // ---- НОЧЬ: нейтральный графит (без синевы и без коричневого бруда), тёплый бурштын-акцент ----
  night: {
    background: '#202227',
    surface: '#1C1E22',
    primary: '#D9A05B',
    primaryText: '#D5D8DE',
    secondaryText: '#9BA0A8',
    border: '#2C2F35',
    selected: '#262A30',
    success: '#6E9A6A',
    danger: '#C26B4F',
    readerBg: '#202227',
    readerText: '#D5D8DE',
    readerDim: '#6A6E76',
    highlight: '#C99A4E',
    popupBg: '#1C1E22',
    popupBorder: '#2C2F35',
    posColor: '#D9A05B',
    bgTop: '#2C2F35',
    bgBot: '#101113',
    neu: { base: '#212329', light: '#3C4047', dark: '#0E0F12', shadowDark: 'rgba(0,0,0,0.55)', shadowLight: 'rgba(255,240,210,0.08)', soft: 'rgba(98,104,114,0.6)', hi: 'rgba(255,245,230,0.07)', glow: 'rgba(140,146,156,0.4)' },
  },
};

export const THEME_ORDER: ThemeMode[] = ['day', 'night'];
// Ключи для i18n (английский = fallback). В UI оборачивается в t().
export const THEME_LABELS: Record<ThemeMode, string> = {
  day: 'Day',
  night: 'Night',
};
