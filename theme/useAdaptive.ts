import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { SIZES } from './constants';

// Единая система адаптивности приложения.
// Ключевые идеи:
//  1) scale — плавный коэффициент от меньшей стороны экрана (fluid scaling);
//  2) bp — дискретные брейкпоинты по ШИРИНЕ (xs/sm/md/lg/xl) для смены раскладки;
//  3) landscape — переключение колонок/высоты хедера при повороте;
//  4) contentMaxW — ограничение ширины контента на больших мониторах (читабельность);
//  5) modal() — размеры попапов, всегда влезающие в экран (maxHeight с запасом).

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface Adaptive {
  width: number;
  height: number;
  minSide: number;
  scale: number;
  bp: Breakpoint;
  landscape: boolean;
  small: boolean;
  tiny: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  pad: number;
  gap: number;
  radius: number;
  headerH: number;
  tabBarH: number;
  tabFs: number;
  showTabLabel: boolean;
  hit: number;
  icon: (base?: number) => number;
  dim: (basePct: number, min: number, max: number) => number;
  fs: (base: number) => number;
  title: number;
  h2: number;
  body: number;
  small_fs: number;
  big: number;
  contentMaxW: number;
  readerMaxW: number;
  columns: number;
  modal: (opts?: { wide?: boolean }) => {
    backdropPad: number;
    width: any;
    maxWidth: number;
    maxHeight: number;
    padding: number;
    borderRadius: number;
  };
  sheetW: number | string;
}

// Брейкпоинты по ширине окна (px, DIP)
const BP_XS = 360;  // очень узкие / 320x480
const BP_SM = 480;  // телефоны
const BP_MD = 768;  // большие телефоны landscape / малые планшеты
const BP_LG = 1024; // планшеты / ноутбуки
// > 1024 → xl (большие мониторы)

export function useAdaptive(): Adaptive {
  const { width, height } = useWindowDimensions();
  const minSide = Math.min(width, height);
  const landscape = width > height;

  return useMemo(() => {
    const bp: Breakpoint =
      width < BP_XS ? 'xs' : width < BP_SM ? 'sm' : width < BP_MD ? 'md' : width < BP_LG ? 'lg' : 'xl';

    // В landscape эталон считаем по высоте, иначе интерфейс раздувается на широком коротком экране.
    const ref = landscape ? Math.min(height * 1.35, minSide * 1.5) : minSide;
    const scale = clamp(ref / 720, 0.58, 1.25);

    const small = minSide < 640;
    const tiny = minSide < 380;
    const isTablet = minSide >= 600 && width < 1280;
    const isDesktop = width >= 1280;

    const compact = tiny ? 0.8 : 1;
    const pad = Math.round(clamp(SIZES.padding * scale * compact, 8, 24));
    const gap = Math.round(clamp(SIZES.gap * scale * compact, 6, 18));
    const radius = Math.round(clamp(SIZES.radius * scale, 6, 18));

    // Хедер в landscape ниже — экономим вертикаль.
    // Хедер: на маленьких экранах заметно ниже — каждая точка высоты нужна контенту.
    const headerH = Math.round(
      clamp(SIZES.headerHeight * scale * (landscape ? 0.72 : 1) * (tiny ? 0.72 : small ? 0.85 : 1), 34, 58)
    );
    // Высота таб-бара считается от содержимого: иконка + подпись + вертикальные отступы.
    // Иначе на маленьких экранах подпись схлопывается в height:0 и обрезается.
    const iconSz = Math.round(clamp(26 * scale * (tiny ? 0.85 : 1), 18, 28));
    const labelFs = Math.round(clamp(10 * scale, 9, 11));
    const showTabLabel = !(landscape && height < 420);
    // Иконка в react-navigation рендерится в контейнере ~28px независимо от size,
    // поэтому считаем от max(iconSz, 28), иначе подпись не влезает и схлопывается в 0.
    // Иконка в react-navigation живёт в боксе ~28px, если её не ужать явно.
    const iconBoxH = tiny ? iconSz + 2 : Math.max(iconSz, 28);
    const tabBarH = Math.round(
      clamp(
        iconBoxH + (showTabLabel ? Math.round(labelFs * 1.4) + 4 : 0) + (tiny ? 6 : small ? 8 : 12),
        tiny ? 44 : 50,
        78
      )
    );

    const fsScale = tiny ? scale * 0.92 : scale;
    // Нижняя граница 11px: мельче текст на телефоне уже нечитаем.
    const fs = (base: number) => Math.round(clamp(base * fsScale, Math.max(11, base * 0.78), base * 1.2));

    const dim = (basePct: number, min: number, max: number) => Math.round(clamp(minSide * basePct, min, max));
    const icon = (base = 22) => Math.round(clamp(base * scale, base * 0.72, base * 1.15));

    // Ширина контента: на больших экранах центрируем колонку, чтобы строки не были бесконечными.
    const contentMaxW = isDesktop ? 960 : bp === 'lg' ? 820 : width;
    // Колонка книжного текста уже общего контента: 60-75 знаков в строке читаются лучше всего.
    const readerMaxW = width >= 900 ? 760 : width >= 700 ? 640 : width;

    // Кол-во колонок для сеток (библиотека, словарь)
    const columns = width >= 1400 ? 4 : width >= 1000 ? 3 : width >= 640 ? 2 : 1;

    const modal = (opts?: { wide?: boolean }) => {
      const backdropPad = Math.round(clamp(width * 0.05, tiny ? 8 : 12, 32));
      const maxWidth = opts?.wide
        ? Math.min(width - backdropPad * 2, 640)
        : Math.min(width - backdropPad * 2, isDesktop ? 480 : 440);
      // Всегда оставляем воздух сверху/снизу; в landscape попап особенно низкий.
      const maxHeight = Math.round(height * (landscape ? 0.86 : 0.82));
      return {
        backdropPad,
        width: '100%' as any,
        maxWidth,
        maxHeight,
        padding: Math.round(clamp(20 * scale, 12, 24)),
        borderRadius: radius,
      };
    };

    // Боковая шторка (FontSettingsSheet): на телефоне почти весь экран, на десктопе фикс.
    const sheetW: number | string = width < BP_SM ? '92%' : width < BP_LG ? '70%' : 420;

    return {
      width, height, minSide, scale, bp, landscape, small, tiny, isTablet, isDesktop,
      pad, gap, radius, headerH, tabBarH,
      tabFs: labelFs,
      showTabLabel,
      hit: Math.round(clamp(44 * scale, 36, 48)),
      icon, dim, fs,
      title: fs(20), h2: fs(17), body: fs(15), small_fs: fs(13), big: fs(44),
      contentMaxW, readerMaxW, columns, modal, sheetW,
    };
  }, [width, height, minSide, landscape]);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
