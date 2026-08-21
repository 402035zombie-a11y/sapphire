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

export interface ThemePalette {
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
}

export const THEMES: Record<ThemeMode, ThemePalette> = {
  // ---- ДЕНЬ: максимально мягкая тёплая бумага, тёплый бурштын-акцент (аналоговая гармония) ----
  day: {
    background: '#EAD9BE',
    surface: '#EAD9BE',
    primary: '#C98A4B', // м'якший теплий карамельний акцент (гармоніює з паперовою палітрою)
    onPrimary: '#FBF4E4', // кремовий знак/текст ПОВЕРХ карамельної заливки
    primaryText: '#4A3F2E', // основний текст на фоні (темно-коричневий, читається на бежі)
    secondaryText: '#A08B66', // чистіший теплий сіро-коричневий (не брудний) для навігації/неактивних
    border: '#D8C7A6',
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
    neu: { base: '#EAD9BE', light: '#FBF1DC', dark: '#BCA982', shadowDark: 'rgba(158,139,103,0.55)', shadowLight: 'rgba(255,255,255,0.7)', soft: 'rgba(248,238,217,0.7)', hi: 'rgba(255,255,255,0.5)', glow: 'rgba(255,250,238,0.5)' },
  },
  // ---- НОЧЬ: розкішний onyx-графіт + золото (bagatstvo/roskish), ivory-текст ----
  night: {
    background: '#16171A',
    surface: '#1C1D21',
    primary: '#34363C',
    onPrimary: '#ECE7DB',
    primaryText: '#ECE7DB',
    secondaryText: '#9A958A',
    border: '#2A2B30',
    selected: '#232429',
    success: '#22C55E',
    danger: '#EF4444',
    backdrop: 'rgba(0,0,0,0.6)',
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
  // ---- BLACKOUT: максимально чёрный фон для OLED (пиксели полностью выключаются) ----
  // Никакого белого: текст и кнопки — светло-серые. Неоморфизм на чёрном не виден,
  // поэтому base делаем светло-серым (#1C1C1E) для видимости кнопок (хрестик удаления и т.п.).
  blackout: {
    background: '#000000',
    surface: '#050505',
    primary: '#232427',
    onPrimary: '#787468',
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
  },
};

export const THEME_ORDER: ThemeMode[] = ['day', 'night', 'blackout'];
// Ключи для i18n (английский = fallback). В UI оборачивается в t().
export const THEME_LABELS: Record<ThemeMode, string> = {
  day: 'Day',
  night: 'Night',
  blackout: 'Blackout',
};
