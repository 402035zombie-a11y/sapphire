// theme/neu.ts
// ПРЕМИУМ-НЕОМОРФИЗМ (soft UI): каждый элемент — выточенный из материала кусок.
//  - ГРАДИЕНТНАЯ ЗАЛИВКА (145deg, light→base→dark) даёт «объём» самой поверхности
//    (псевдо-выпуклость), а не только тени. Это и есть «дорогой» вид вместо плоской
//    картонной наклейки.
//  - МНОГОСЛОЙНЫЕ МЯГКИЕ тени: тёмная падающая (низ-право, большой blur) + цветной
//    объём (soft) + тонкий белый хайлайт (hi) сверху-слева + мягкая внутренняя окантовка.
//  - blur ≈ 2.4×offset (раньше 1.3) → тени размытые, не резкие обводки.
// На web всё в boxShadow + backgroundImage. На iOS RN — только внешняя тень (базовый
// объём через shadow*), градиент не поддерживается нативой → плоский base (приемлемо).
//
// ВАЖНО для ШИРОКИХ блоков: основной сдвиг ВНИЗ (по X минимум), иначе тень
// «размазывается по бокам» (эффект туннеля).

import { Platform } from 'react-native';
import { ThemePalette } from './themes';

export type NeuStyle = any;

// градиент «выточки»: сверху-слева светлее → внизу-справа темнее
function extrude(t: ThemePalette): string {
  return `linear-gradient(145deg, ${t.neu.light} 0%, ${t.neu.base} 52%, ${t.neu.dark} 100%)`;
}

// выпуклый (raised): мягкий многослойный объём
export function neuRaised(t: ThemePalette, radius: number, strength = 1): any {
  const off = Math.max(4, Math.round((radius * 0.18 + 4) * strength)); // базовый сдвиг
  const x = Math.round(off * 0.92);
  const y = off;
  const blur1 = Math.round(off * 2.0); // ближний мягкий слой
  const blur2 = Math.round(off * 4.0); // дальний очень мягкий слой (глубина)
  const { shadowDark: d, soft: s, hi, light: l } = t.neu;
  const ix = Math.max(2, Math.round(off * 0.35));
  const iy = Math.max(2, Math.round(off * 0.4));
  const iblur = Math.round(off * 1.4);
  const style: any = {
    backgroundColor: t.neu.base,
    backgroundImage: extrude(t),
    backgroundClip: 'padding-box',
    borderRadius: radius,
    boxShadow: [
      `${x}px ${y}px ${blur1}px ${d}`, // тёмная падающая (ближняя)
      `${x * 1.6}px ${y * 1.6}px ${blur2}px ${d}`, // тёмная падающая (дальняя, глубина)
      `${-x}px ${-y}px ${blur1}px ${s}`, // цветной объём сверху-слева (видим на тёмном)
      `${-x * 1.6}px ${-y * 1.6}px ${blur2}px ${l}`, // светлый ореол (дальний)
      `inset ${ix}px ${iy}px ${iblur}px ${hi}`, // тонкий внутренний блик (объём края)
      `inset ${-ix}px ${-iy}px ${iblur}px ${d}`, // внутренняя тень снизу-справа
    ].join(', '),
    ...(Platform.OS === 'web' ? {} : { shadowColor: d, shadowOffset: { width: x, height: y }, shadowOpacity: 0.5, shadowRadius: blur1, elevation: Math.max(3, Math.round(off)) }),
  };
  return style;
}

// утопленный (inset): мягкое углубление с читаемым бортиком
export function neuInset(t: ThemePalette, radius: number, strength = 1): any {
  const off = Math.max(4, Math.round((radius * 0.42 + 5) * strength));
  const x = Math.round(off * 0.9);
  const y = off;
  const blur1 = Math.round(off * 2.4);
  const blur2 = Math.round(off * 4.5);
  const { shadowDark: d, soft: s, hi, light: l } = t.neu;
  const rx = Math.max(1, Math.round(off * 0.3));
  const ry = Math.max(1, Math.round(off * 0.34));
  return {
    backgroundColor: t.neu.base,
    backgroundImage: `linear-gradient(145deg, ${t.neu.dark} 0%, ${t.neu.base} 55%, ${t.neu.light} 100%)`,
    backgroundClip: 'padding-box',
    borderRadius: radius,
    boxShadow: [
      `inset ${-x}px ${-y}px ${blur1}px ${d}`, // тёмная сверху-слева (углубление)
      `inset ${x}px ${y}px ${blur1}px ${s}`, // цветной блик снизу-справа
      `inset ${-x * 1.6}px ${-y * 1.6}px ${blur2}px ${d}`,
      `${rx}px ${ry}px ${Math.round(off * 1.2)}px ${l}`, // внешний светлый rim (бортик)
    ].join(', '),
    ...(Platform.OS === 'web' ? {} : { shadowColor: d, shadowOffset: { width: -x, height: -y }, shadowOpacity: 0.7, shadowRadius: blur1, elevation: 0 }),
  };
}

// акцентная кнопка (primary): заливка primary + мягкий объём + верхний блик
export function neuPrimary(t: ThemePalette, radius: number): any {
  const off = Math.max(3, Math.round(radius * 0.22 + 3));
  const blur1 = Math.round(off * 2.2);
  const blur2 = Math.round(off * 4.0);
  const x = Math.round(off * 0.9);
  return {
    backgroundColor: t.primary,
    backgroundImage: `linear-gradient(145deg, ${t.primary} 0%, ${t.primary} 60%, ${t.primary})`,
    borderRadius: radius,
    boxShadow: [
      `${x}px ${off}px ${blur1}px rgba(0,0,0,0.45)`,
      `${x * 1.6}px ${off * 1.6}px ${blur2}px rgba(0,0,0,0.35)`,
      `inset 0 1px 2px rgba(255,255,255,0.35)`, // верхний блик
      `inset 0 -2px 5px rgba(0,0,0,0.30)`, // нижняя внутренняя тень
    ].join(', '),
    elevation: Math.max(3, Math.round(off)),
  };
}

export function neuCard(t: ThemePalette, radius: number): any {
  return neuRaised(t, radius);
}

// Запас под тень: ScrollView/FlatList клиппит overflow по своему bounding box,
// поэтому box-shadow последних neu-карточек режется краем скролла.
export function neuShadowPad(radius = 12): number {
  const off = Math.max(4, Math.round(radius * 0.18 + 4));
  const blur = Math.round(off * 4.0);
  return Math.max(18, off + blur);
}
export function neuInsetCard(t: ThemePalette, radius: number): any {
  return neuInset(t, radius);
}

// Градиентный фон экрана (премиум-глубина): сверху-центр светлее → края темнее.
// Используется вместо плоского backgroundColor: theme.background на корнях экранов.
export function screenBg(t: ThemePalette): any {
  return {
    backgroundColor: t.background,
    backgroundImage: `linear-gradient(160deg, ${t.bgTop} 0%, ${t.background} 45%, ${t.bgBot} 100%)`,
    backgroundClip: 'border-box',
  };
}

// круглая кнопка (play/fab/icon): raised — для круга равное смещение корректно
export function neuCircle(t: ThemePalette, size: number, filled = false): any {
  const off = Math.max(4, Math.round(size * 0.14));
  const blur1 = Math.round(off * 2.0);
  const blur2 = Math.round(off * 4.0);
  const { shadowDark: d, soft: s, hi, light: l } = t.neu;
  const ix = Math.max(2, Math.round(off * 0.5));
  const iy = Math.max(2, Math.round(off * 0.5));
  const iblur = Math.round(off * 1.4);
  return {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: filled ? t.primary : t.neu.base,
    backgroundImage: filled ? undefined : extrude(t),
    backgroundClip: 'padding-box',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: [
      `${off}px ${off}px ${blur1}px ${d}`,
      `${off * 1.6}px ${off * 1.6}px ${blur2}px ${d}`,
      `${-off}px ${-off}px ${blur1}px ${s}`,
      `${-off * 1.6}px ${-off * 1.6}px ${blur2}px ${l}`,
      `inset ${ix}px ${iy}px ${iblur}px ${hi}`,
      `inset ${-ix}px ${-iy}px ${iblur}px ${d}`,
    ].join(', '),
    elevation: Math.max(3, Math.round(off)),
  };
}
