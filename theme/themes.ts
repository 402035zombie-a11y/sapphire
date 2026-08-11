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
  // Неоморфические тени для текущей темы
  neu: NeuColors;
}

export const THEMES: Record<ThemeMode, ThemePalette> = {
  // ---- ДЕНЬ: максимально мягкая тёплая бумага, низкий контраст ----
  day: {
    background: '#EAD9BE',
    surface: '#EAD9BE',
    primary: '#C8741E',
    primaryText: '#5C4A33',
    secondaryText: '#8C7A5E',
    border: '#D8C7A6',
    selected: '#DFCDAC',
    success: '#6E8A4E',
    danger: '#B5583C',
    readerBg: '#F2E6CE',
    readerText: '#5C4A33',
    readerDim: '#B7A684',
    highlight: '#E5973A',
    popupBg: '#EAD9BE',
    popupBorder: '#D8C7A6',
    posColor: '#C8741E',
    neu: { base: '#EAD9BE', light: '#F8EED9', dark: '#BCA982', shadowDark: 'rgba(158,139,103,0.7)', shadowLight: 'rgba(255,250,238,0.95)', glow: 'rgba(255,250,238,0.5)' },
  },
  // ---- НОЧЬ: глубокий графит (НЕ чистый чёрный — не выбивает из палитры), приглушённый текст ----
  night: {
    background: '#1A1D22',
    surface: '#171A1F',
    primary: '#E08A45',
    primaryText: '#A6AAAF',
    secondaryText: '#6E727A',
    border: '#262A31',
    selected: '#20242B',
    success: '#5FA86B',
    danger: '#D2644A',
    readerBg: '#1A1D22',
    readerText: '#A6AAAF',
    readerDim: '#5B5F66',
    highlight: '#C98A3E',
    popupBg: '#171A1F',
    popupBorder: '#262A31',
    posColor: '#E08A45',
    neu: { base: '#1C1F26', light: '#343943', dark: '#0C0E11', shadowDark: 'rgba(0,0,0,0.9)', shadowLight: 'rgba(80,88,100,0.55)', glow: 'rgba(80,88,100,0.25)' },
  },
};

export const THEME_ORDER: ThemeMode[] = ['day', 'night'];
// Ключи для i18n (английский = fallback). В UI оборачивается в t().
export const THEME_LABELS: Record<ThemeMode, string> = {
  day: 'Day',
  night: 'Night',
};
