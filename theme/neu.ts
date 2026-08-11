// theme/neu.ts
// ПОЛНЫЙ неоморфизм: каждый элемент несёт И внешние, И внутренние тени.
//  - RAISED (выпуклый): внешняя пара (тёмная снизу-справа + светлая сверху-слева)
//    + тонкая ВНУТРЕННЯЯ окантовка (светлая сверху-слева, тёмная снизу-справа) →
//    элемент читается как ОБЪЁМНЫЙ выдавленный кусок.
//  - INSET (вдавленный): внутренняя пара ИНВЕРТИРОВАННАЯ (тёмная сверху-слева +
//    светлая снизу-справа) + внешний светлый «rim» по краю → углубление с чётким краем.
// На web всё ложится в boxShadow (несколько слоёв). На iOS RN берёт только
// внешнюю через shadow* — базовый объём сохраняется, web получает полный.
//
// ВАЖНО для ШИРОКИХ блоков: основной сдвиг ВНИЗ (по X минимум), иначе тень
// «размазывается по бокам» (эффект туннеля). Внутренняя окантовка — ещё меньше.

import { Platform } from 'react-native';
import { ThemePalette } from './themes';

export type NeuStyle = any;

// выпуклый (raised): солнце сверху → блик вверх-влево (светлый), тёмная падающая тень вниз-вправо + внутренняя окантовка (объём)
export function neuRaised(t: ThemePalette, radius: number, strength = 1): any {
  const off = Math.max(3, Math.round((radius * 0.22 + 3) * strength)); // заметный сдвиг (читается на тёмном)
  const blur = Math.round(off * 1.3);
  const x = Math.max(2, Math.round(off * 0.4));
  const y = off;
  const { shadowDark: d, shadowLight: l } = t.neu;
  const ix = Math.max(2, Math.round(off * 0.28));
  const iy = Math.max(2, Math.round(off * 0.32));
  const iblur = Math.round(off * 0.8);
  return {
    backgroundColor: t.neu.base,
    borderRadius: radius,
    boxShadow: [
      `${x}px ${y}px ${blur}px ${d}`, // тёмная падающая тень ВНИЗ (солнце сверху)
      `${-x}px ${-y}px ${blur}px ${l}`, // светлый блик ВВЕРХ-ВЛЕВО
      `inset ${ix}px ${iy}px ${iblur}px ${l}`, // внутренняя подсветка сверху-слева (объём)
      `inset ${-ix}px ${-iy}px ${iblur}px ${d}`, // внутренняя тень снизу-справа (объём)
    ].join(', '),
    ...(Platform.OS === 'web' ? {} : { shadowColor: d, shadowOffset: { width: x, height: y }, shadowOpacity: 0.55, shadowRadius: blur, elevation: Math.max(2, Math.round(off)) }),
  };
}

// утопленный (inset): ВНУТРЕННЯЯ пара инвертирована (тёмная сверху-слева + светлая снизу-справа)
// + внешний светлый rim по краю для читаемого объёма
export function neuInset(t: ThemePalette, radius: number, strength = 1): any {
  const off = Math.max(3, Math.round((radius * 0.5 + 4) * strength));
  const blur = Math.round(off * 1.8);
  const x = Math.max(1, Math.round(off * 0.4));
  const y = off;
  const { shadowDark: d, shadowLight: l } = t.neu;
  // внешний rim: тонкая светлая линия по краю (сверху-слева), даёт «бортик» углублению
  const rx = Math.max(1, Math.round(off * 0.22));
  const ry = Math.max(1, Math.round(off * 0.26));
  return {
    backgroundColor: t.neu.base,
    borderRadius: radius,
    boxShadow: [
      `inset ${-x}px ${-y}px ${blur}px ${d}`,
      `inset ${x}px ${y}px ${blur}px ${l}`,
      `${rx}px ${ry}px ${Math.round(off * 0.6)}px ${l}`,
    ].join(', '),
    ...(Platform.OS === 'web' ? {} : { shadowColor: d, shadowOffset: { width: -x, height: -y }, shadowOpacity: 0.85, shadowRadius: blur, elevation: 0 }),
  };
}

// акцентная кнопка (primary): плоская заливка primary + объём через
// внешнюю пару + ВНУТРЕННЮЮ подсветку сверху и затемнение снизу
export function neuPrimary(t: ThemePalette, radius: number): any {
  const off = Math.max(2, Math.round(radius * 0.28 + 2.5));
  const blur = Math.round(off * 1.6);
  const x = Math.max(1, Math.round(off * 0.35));
  return {
    backgroundColor: t.primary,
    borderRadius: radius,
    boxShadow: [
      `${x}px ${off}px ${blur}px rgba(255,255,255,0.10)`, // светлый блик: чуть вправо-вниз
      `inset 0 -1px 2px rgba(255,255,255,0.30)`, // внутренняя подсветка снизу (объём)
      `inset 0 -2px 4px rgba(0,0,0,0.30)`, // внутренняя нижняя тень (объём/стилизация)
    ].join(', '),
    elevation: Math.max(3, Math.round(off)),
  };
}

export function neuCard(t: ThemePalette, radius: number): any {
  return neuRaised(t, radius);
}

// Запас под тень: ScrollView/FlatList клиппит overflow по своему bounding box,
// поэтому box-shadow последних neu-карточек (сдвиг вниз + blur) режется краем скролла.
// Даём contentContainerStyle padding ≥ этого размера — тень помещается внутри клипа.
// radius — радиус карточек внутри скролла (по умолчанию 12, как в попапах).
export function neuShadowPad(radius = 12): number {
  const off = Math.max(2, Math.round(radius * 0.16 + 1.5));
  const blur = Math.round(off * 1.0);
  return Math.max(10, off + blur + 4);
}
export function neuInsetCard(t: ThemePalette, radius: number): any {
  return neuInset(t, radius);
}

// круглая кнопка (play/fab/icon): raised — для круга равное смещение корректно (нет «боков»)
// + внутренняя окантовка для объёма
export function neuCircle(t: ThemePalette, size: number, filled = false): any {
  const off = Math.max(3, Math.round(size * 0.12));
  const blur = Math.round(off * 1.3);
  const { shadowDark: d, shadowLight: l } = t.neu;
  const ix = Math.max(2, Math.round(off * 0.5));
  const iy = Math.max(2, Math.round(off * 0.5));
  const iblur = Math.round(off * 0.8);
  return {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: filled ? t.primary : t.neu.base,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: [
      `${off}px ${off}px ${blur}px ${d}`, // тёмная падающая тень ВНИЗ-ВПРАВО
      `${-off}px ${-off}px ${blur}px ${l}`, // светлый блик ВВЕРХ-ВЛЕВО
      `inset ${ix}px ${iy}px ${iblur}px ${l}`, // внутренняя подсветка сверху-слева (объём)
      `inset ${-ix}px ${-iy}px ${iblur}px ${d}`, // внутренняя тень снизу-справа (объём)
    ].join(', '),
    elevation: Math.max(2, Math.round(off)),
  };
}
