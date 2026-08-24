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

// ГЛОБАЛЬНЫЙ КОЭФФИЦИЕНТ ВНЕШНЕЙ (падающей) ТЕНИ.
// 1 = исходно (сильно размытая, большой разлёт). Юзер (24.08): зовнішні тіні ПОВЕРНУТИ,
// але маленькі — великі виглядали ореолом, нуль = плоско. 0.35 = компактний об'єм.
const OUTER_SHADOW = 0.35;

// затемнить/осветлить hex-цвет на долю amt (-1..1)
function shade(hex: string, amt: number): string {
  const m = hex.replace('#', '');
  const n = parseInt(m.length === 3 ? m.split('').map((c) => c + c).join('') : m, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c : 255 - c) * amt)));
  r = f(r); g = f(g); b = f(b);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// градиент «выточки»: сверху-слева светлее → внизу-справа темнее
function extrude(t: ThemePalette): string {
  return `linear-gradient(145deg, ${t.neu.light} 0%, ${t.neu.base} 52%, ${t.neu.dark} 100%)`;
}

// выпуклый (raised): мягкий многослойный объём
export function neuRaised(t: ThemePalette, radius: number, strength = 1): any {
  // FLAT-режим (blackout): без неоморфізму — прозорий фон + тонкий бордер кольору тексту
  if ((t as any).flat) {
    return {
      borderRadius: radius,
      borderWidth: 1,
      borderColor: t.primaryText,
    };
  }
  const off = Math.max(4, Math.round((radius * 0.18 + 4) * strength)); // базовый сдвиг
  const x = off * 0.5;
  const y = off * 0.5;
  const blur1 = Math.round(off * 1.0); // ближний мягкий слой (зменшено)
  const blur2 = Math.round(off * 2.0); // дальний очень мягкий слой (зменшено в 2x)
  const { shadowDark: d, soft: s, hi, light: l } = t.neu;
  const ix = Math.max(2, Math.round(off * 0.35));
  const iy = Math.max(2, Math.round(off * 0.4));
  const iblur = Math.round(off * 1.4);
  // внешняя (падающая) тень — компактнее, чтобы объём читался, а не тонул в ореоле
  const oX = Math.round(x * OUTER_SHADOW);
  const oY = Math.round(y * OUTER_SHADOW);
  const oB1 = Math.round(blur1 * OUTER_SHADOW);
  const oB2 = Math.round(blur2 * OUTER_SHADOW);
  const style: any = {
    backgroundColor: t.neu.base,
    backgroundImage: extrude(t),
    backgroundClip: 'padding-box',
    // Android: gradient-фон не рендериться → поверхня мертво пласка. Тонкий бордер
    // light-кольором дає читабельну кромку (рендериться нативно).
    ...(Platform.OS === 'web' ? {} : { borderWidth: 1, borderColor: t.neu.light }),
    borderRadius: radius,
    boxShadow: [
      `${oX}px ${oY}px ${oB1}px ${d}`, // тёмная падающая (ближняя)
      `${Math.round(oX * 1.6)}px ${Math.round(oY * 1.6)}px ${oB2}px ${d}`, // тёмная падающая (дальняя, глубина)
      `${-x}px ${-y}px ${blur1}px ${s}`, // цветной объём сверху-слева (видим на тёмном)
      `${-x * 1.6}px ${-y * 1.6}px ${blur2}px ${l}`, // светлый ореол (дальний)
      `inset ${ix}px ${iy}px ${iblur}px ${hi}`, // тонкий внутренний блик (объём края)
      `inset ${-ix}px ${-iy}px ${iblur}px ${d}`, // внутренняя тень снизу-справа
    ].join(', '),
    ...(Platform.OS === 'web' ? {} : { shadowColor: d, shadowOffset: { width: oX, height: oY }, shadowOpacity: 0.5, shadowRadius: oB1, elevation: Math.max(3, Math.round(off)) }),
  };
  return style;
}

// утопленный (inset): мягкое углубление с читаемым бортиком
export function neuInset(t: ThemePalette, radius: number, strength = 1): any {
  // FLAT-режим: як raised — бордер кольору тексту, без тіней
  if ((t as any).flat) {
    return {
      borderRadius: radius,
      borderWidth: 1,
      borderColor: t.primaryText,
    };
  }
  const off = Math.max(4, Math.round((radius * 0.42 + 5) * strength));
  const x = off * 0.5;
  const y = off * 0.5;
  const blur1 = Math.round(off * 1.2); // зменшено
  const blur2 = Math.round(off * 2.2); // зменшено в 2x
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
    // Юзер N16: поле вводу мало бути вдавленим — на Android inset-тіні не рендеряться,
    // даємо темний бордер зверху/зліва (імітація грані лунки) через повний border.
    ...(Platform.OS === 'web' ? {} : { borderWidth: 1, borderColor: t.neu.dark, shadowColor: d, shadowOpacity: 0.4, shadowRadius: 2, elevation: 1 }),
  };
}

// акцентная кнопка (primary): заливка primary + мягкий объём + верхний блик
export function neuPrimary(t: ThemePalette, radius: number): any {
  // FLAT: заливка primary + бордер кольору onPrimary, без тіней
  if ((t as any).flat) {
    return {
      backgroundColor: t.primary,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: t.onPrimary,
    };
  }
  const off = Math.max(3, Math.round(radius * 0.22 + 3));
  const blur1 = Math.round(off * 2.2);
  const blur2 = Math.round(off * 4.0);
  const x = Math.round(off * 0.9);
  return {
    backgroundColor: t.primary,
    backgroundImage: `linear-gradient(145deg, ${t.primary} 0%, ${t.primary} 60%, ${t.primary})`,
    borderRadius: radius,
    boxShadow: [
      `${Math.round(x * OUTER_SHADOW)}px ${Math.round(off * OUTER_SHADOW)}px ${Math.round(blur1 * OUTER_SHADOW)}px ${specDark(t)}`,
      `${Math.round(x * 1.6 * OUTER_SHADOW)}px ${Math.round(off * 1.6 * OUTER_SHADOW)}px ${Math.round(blur2 * OUTER_SHADOW)}px ${specDark(t)}`,
      `inset 0 1px 2px ${rim(t)}`, // верхній блік (темозалежний, не хардкод)
      `inset 0 -2px 5px ${specDark(t)}`, // нижня внутрішня тінь
    ].join(', '),
    // Android: суцільний фон t.primary є → elevation безпечний
    ...(Platform.OS === 'web' ? {} : { elevation: Math.max(3, Math.round(off)) }),
  };
}

export function neuCard(t: ThemePalette, radius: number): any {
  return neuRaised(t, radius);
}

// Запас под тень: ScrollView/FlatList клиппит overflow по своему bounding box,
// поэтому box-shadow последних neu-карточек режется краем скролла.
export function neuShadowPad(radius = 12): number {
  const off = Math.max(2, Math.round(radius * 0.12 + 2));
  const blur = Math.round(off * 2.0);
  return Math.max(6, off + blur);
}
export function neuInsetCard(t: ThemePalette, radius: number): any {
  return neuInset(t, radius);
}

// Градиентный фон экрана (премиум-глубина): сверху-центр светлее → края темнее.
// Используется вместо плоского backgroundColor: theme.background на корнях экранов.
export function screenBg(t: ThemePalette): any {
  // FLAT: чистий колір без градієнта
  if ((t as any).flat) {
    return { backgroundColor: t.background };
  }
  return {
    backgroundColor: t.background,
    backgroundImage: `linear-gradient(160deg, ${t.bgTop} 0%, ${t.background} 45%, ${t.bgBot} 100%)`,
    backgroundClip: 'border-box',
  };
}

// круглая кнопка (play/fab/icon): raised — для круга равное смещение корректно
export function neuCircle(t: ThemePalette, size: number, filled = false): any {
  // FLAT: коло з бордером кольору тексту; filled — заливка primary
  if ((t as any).flat) {
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: filled ? t.primary : 'transparent',
      borderWidth: 1,
      borderColor: filled ? t.onPrimary : t.primaryText,
      alignItems: 'center',
      justifyContent: 'center',
    };
  }
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
    // Android: градієнт не рендериться, а elevation з градієнтним фоном = квадратна тінь
    backgroundImage: Platform.OS === 'web' && !filled ? extrude(t) : undefined,
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

// ====================== МЕТАЛЛ (liquid-metal / polished chrome) ======================
// Элитный премиум: холодный полированный металл (хром/анодированный алюминий),
// а НЕ брушеная сталь со щёточными линиями (выглядит старомодно, как скевоморфизм 2011).
// По стандарту Argent liquid-metal (2026): металл = ТЕКУЩИЕ ОТРАЖАЮЩИЕ ПОЛОСЫ (reflection
// banding) + spec(t)ULAR SHEEN + EDGE rim(t), без вертикальных линий щётки.
//  - ДИАГОНАЛЬНЫЙ мягкий блик (linear-gradient 135deg со светлой полосой по краю) = отражение.
//  - РАДИАЛЬНЫЙ specular в углу = как полированный шар (для круглых).
//  - EDGE RIM (светлая кромка) — металл сосредоточен на краю, центр спокойный → читаемость.
//  - Холодная хромовая палитра: base тёмно-стальной, light = холодный серебристый (не тёплый).
// Гравированный текст на металле — через metalText(t).

// холодное отражение (УГЛОВОЙ radial-specular, РЕЗКИЙ — без размытия «грязного» блика)
// Позиция блика — в ПИКСЕЛЯХ (а не %), чтобы на больших элементах он оставался
// у самого верхнего края, а не сползал вниз (иначе блик перекрывает заголовок).
function sheen(): string {
  // Блик ВЫНЕСЕН НАРУЖУ за верхний левый край (не перекрывает заголовки/контент).
  // Оттенок — светло-СЕРЫЙ (холодный), НЕ чистый белый (по правилу металла).
  return [
    'radial-gradient(55% 70% at -10px -8px, rgba(226,234,246,0.22) 0%, rgba(226,234,246,0) 28%)',
    'radial-gradient(115% 135% at calc(100% + 10px) calc(100% + 8px), rgba(0,0,0,0.30) 0%, rgba(0,0,0,0) 34%)',
    'radial-gradient(125% 125% at -10px -8px, rgba(186,206,232,0.11) 0%, rgba(186,206,232,0) 32%)',
  ].join(', ');
}

// направленный градиент металла (ХОЛОДНЫЙ СЕРЕБРИСТЫЙ ХРОМ — собственные оттенки,
// светлее палитры приложения, чтобы металл читался как хром даже на тёмной теме,
// а не сливался с тёмным фоном в «матовый пластик»)
// Темозависимые specular-константы (вместо хардкода под тёмную тему).
// soft/hi — тёплый/светлый блик (есть в обеих палитрах), shadowDark — грань/тень.
function spec(t: ThemePalette): string { return t.neu.soft; }
function specDark(t: ThemePalette): string { return t.neu.shadowDark; }
function rim(t: ThemePalette): string { return t.neu.hi; }

function metalExtrude(t: ThemePalette): string {
  // Темозависимый металлический градиент: в светлой теме — бежевый хром (светлее фона),
  // в тёмной — стальной. Берём оттенки из t.neu, чтобы панели НЕ имели чужеродного
  // (стального/синего) оттенка на светлом бежевом фоне.
  return `linear-gradient(145deg, ${t.neu.light} 0%, ${t.neu.base} 46%, ${t.neu.base} 54%, ${t.neu.dark} 100%)`;
}

function metalBg(t: ThemePalette): string {
  // мягкий блик ПОВЕРХ направленного хромового градиента (без вертикальных линий)
  return `${sheen()}, ${metalExtrude(t)}`;
}


export function neuMetalRaised(t: ThemePalette, radius: number, strength = 1): any {
  // FLAT-режим: плаский бокс з обводкою, без металу
  if ((t as any).flat) {
    return {
      backgroundColor: t.surface,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: t.primaryText,
    };
  }
  const sc = t.neuScale ?? { depth: 1, spread: 1 };
  // Нелінійна шкала: офсет росте повільніше за розмір (size^0.75) —
  // маленькі кнопки не тонуть у власних тінях, великі картки не "розповзаються".
  const baseOff = Math.max(3, Math.round(Math.pow(radius, 0.75) * 1.9));
  const off = Math.max(3, Math.round((baseOff * (0.18 * radius / Math.max(radius, 1)) + 4) * strength * sc.depth));
  const x = Math.max(2, Math.round(off * 0.92 * sc.spread));
  const y = Math.max(2, Math.round(off * sc.spread));
  const blur1 = Math.max(3, Math.round(off * 2.0));
  const blur2 = Math.max(5, Math.round(off * 4.0 * sc.spread));
  const { soft: s, light: l } = t.neu;
  // specular-блик у верхнего края: вертикальный сдвиг МАЛЫЙ И ФИКСИРОВАННЫЙ,
  // чтобы на больших элементах блик НЕ сползал вниз под заголовок.
  // Юзер (24.08): внутрішні тіні raised замалі — об'єм не читається. bevel x0.5/y0.35, blur x1.7
  const ix = Math.max(3, Math.round(off * 0.5));
  const iy = Math.max(2, Math.round(off * 0.35));
  const iblur = Math.round(off * 1.7);
  // внешняя падающая тень — компактнее (объём читается)
  const oX = Math.round(x * OUTER_SHADOW);
  const oY = Math.round(y * OUTER_SHADOW);
  const oB1 = Math.round(blur1 * OUTER_SHADOW);
  const oB2 = Math.round(blur2 * OUTER_SHADOW);
  return {
    backgroundColor: t.neu.base,
    backgroundImage: metalBg(t),
    backgroundClip: 'padding-box',
    borderRadius: radius,
    boxShadow: [
      `${-oX}px ${-oY}px ${oB1}px ${s}`,
      `${-Math.round(oX * 1.6)}px ${-Math.round(oY * 1.6)}px ${oB2}px ${l}`,
      `inset 0 1.5px 0 0 ${rim(t)}`, // светлый верхний rim (кромка металла, мягко)
      `inset 0 1px 3px 0 ${spec(t)}`, // РЕЗКИЙ specular-блик у верхнего края (литой блеск, светло-серый)
      `inset ${ix}px ${iy}px ${iblur}px ${spec(t)}`, // объёмный specular сверху-слева (мягко, не полоса)
      `inset ${-ix}px ${-iy}px ${iblur}px ${specDark(t)}`, // тёмная грань снизу-справа
    ].join(', '),
    ...(Platform.OS === 'web' ? {} : { shadowColor: specDark(t), shadowOffset: { width: -oX, height: -oY }, shadowOpacity: 0.5, shadowRadius: oB1, elevation: Math.max(3, Math.round(off)) }),
  };
}

export function neuMetalCircle(t: ThemePalette, size: number, filled = false): any {
  const sc = t.neuScale ?? { depth: 1, spread: 1 };
  // Нелінійно: мала кнопка (28px) має компактну тінь з видимим контуром,
  // великий FAB (56px) — пропорційно глибшу, але не вдвічі більшу.
  // Юзер (24.08): зовнішні тіні круглих кнопок завеликі — коеф 0.62->0.48
  const off = Math.max(3, Math.round(Math.pow(size, 0.72) * 0.48 * sc.depth));
  const blur1 = Math.max(3, Math.round(off * 2.0 * sc.spread));
  const blur2 = Math.max(5, Math.round(off * 3.4 * sc.spread));
  const { soft: s, light: l } = t.neu;
  // Inner bevel: ≥3px і 0.6*off — інакше внутрішній рельєф не читається (юзер-фідбек)
  const ix = Math.max(3, Math.round(off * 0.6));
  const iy = Math.max(3, Math.round(off * 0.6));
  const iblur = Math.max(4, Math.round(off * 1.5));
  return {
    width: size,
    height: size,
    borderRadius: size / 2,
    // Android: backgroundImage не рендериться → elevation малює КВАДРАТНУ тінь.
    // Суцільний фон + shadow* дає круглу тінь і преміальний вигляд.
    ...(Platform.OS === 'web'
      ? {
          backgroundColor: filled ? t.primary : t.neu.base,
          backgroundImage: filled
            ? `linear-gradient(180deg, ${shade(t.primary, 0.25)} 0%, ${t.primary} 55%, ${shade(t.primary, -0.28)} 100%)`
            : metalBg(t),
          backgroundClip: 'padding-box',
        }
      : {
          backgroundColor: filled ? t.primary : t.neu.base,
        }),
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'box-shadow 160ms ease, transform 160ms ease',
    boxShadow: filled
      ? [
          // FAB (юзер-фідбек 24.08): компактна зовнішня пара з ПРАВИЛЬНОЮ геометрією
          // (раніше офсет множився на OUTER_SHADOW двічі → 1px змазана пляма)
          `${Math.max(2, Math.round(off * 0.5))}px ${Math.max(2, Math.round(off * 0.6))}px ${blur1}px ${specDark(t)}`,
          // Юзер M2: внутрішні тіні FAB об'ємніші
          `inset 0 3px 5px ${rim(t)}`,
          `inset 0 -4px 8px ${specDark(t)}`,
          `inset ${Math.max(2, Math.round(off*0.3))}px ${Math.max(2, Math.round(off*0.3))}px ${Math.round(off)}px rgba(0,0,0,0.18)`,
        ].join(', ')
      : [
          // ВИПУКЛИЙ (raised): КОМПАКТНА зовнішня пара (юзер: великі тіни ламають об'єм).
          // Один dark-шар замість двох, light ближчий.
          `${Math.max(2, Math.round(off * 0.55))}px ${Math.max(2, Math.round(off * 0.65))}px ${blur1}px ${specDark(t)}`,
          `${-Math.round(off * 0.45)}px ${-Math.round(off * 0.45)}px ${Math.max(4, Math.round(blur1))}px ${s}`,
          `${-Math.round(off * 0.8)}px ${-Math.round(off * 0.8)}px ${Math.max(6, Math.round(blur2))}px ${l}`,
          `inset 0 1px 0 0 ${rim(t)}`,
          `inset ${ix}px ${iy}px ${iblur}px ${spec(t)}`,
          `inset ${-ix}px ${-iy}px ${iblur}px ${specDark(t)}`,
        ].join(', '),
    elevation: filled ? Math.max(4, Math.round(off * 1.2)) : Math.max(2, Math.round(off * 0.8)),
  };
}

// ВДАВЛЕНИЙ circle (для кнопок видалення) — без зовнішніх тіней, тільки inset
// ВДАВЛЕНИЙ circle (кнопки видалення/дій всередині карток): м'який внутрішній рельєф
// + ЛЕГКИЙ зовнішній контур (раніше elevation=0 і жодних зовнішніх шарів → кнопка "плавала")
export function neuMetalCircleInset(t: ThemePalette, size: number): any {
  const sc = t.neuScale ?? { depth: 1, spread: 1 };
  const off = Math.max(3, Math.round(Math.pow(Math.max(size, 12), 0.72) * 0.5 * sc.depth));
  const ix = Math.max(2, Math.round(off * 0.55));
  const iy = Math.max(2, Math.round(off * 0.55));
  const iblur = Math.max(3, Math.round(off * 1.5));
  // компактна зовнішня тінь (юзер: маленькі зовнішні тіні на всіх кнопках)
  const ox = Math.max(2, Math.round(off * 0.35 * sc.spread));
  return {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: t.neu.base,
    backgroundImage: metalBg(t),
    backgroundClip: 'padding-box',
    alignItems: 'center',
    justifyContent: 'center',
    // Юзер (24.08): зовнішню пару лишити, але КОМПАКТНУ (була повнорозмірна → ореол).
    boxShadow: [
      // Юзер (24.08): зовнішні тіні X-кнопок слабо виражені → повний ox + elevation 3
      `${Math.max(2, Math.round(ox))}px ${Math.max(2, Math.round(ox))}px ${Math.round(ox * 2)}px ${specDark(t)}`,
      `${-Math.max(2, Math.round(ox * 0.7))}px ${-Math.max(2, Math.round(ox * 0.7))}px ${Math.round(ox * 1.5)}px ${spec(t)}`,
      `inset ${ix}px ${iy}px ${iblur}px ${specDark(t)}`,
      `inset ${-ix}px ${-iy}px ${iblur}px ${spec(t)}`,
      `inset 0 1px 0 0 ${rim(t)}`,
    ].join(', '),
    elevation: 3,
  };
}

// гравированный текст на металле: тёмная тень сверху + светлая снизу (эффект чеканки)
export function metalText(t: ThemePalette, color?: string): any {
  return {
    color: color ?? t.primaryText,
  };
}

// ====================== ЕДИНЫЙ МЕТАЛЛ-СКИН ======================
// Центральный диспетчер: один вызов стилизует любой элемент с ролью + модификаторами.
// Роли: 'raised' | 'inset' | 'circle' | 'primary' | 'tab' | 'tabActive' | 'text'
// Модификаторы: { size?, radius?, filled?, active?, pressed? }
// Это даёт сплошную систему вместо разрозненных вызовов neuMetalRaised/neuMetalCircle/...
type MetalRole = 'raised' | 'inset' | 'circle' | 'circleInset' | 'primary' | 'tab' | 'tabActive' | 'tabStamp' | 'tabStampActive' | 'stamp' | 'text';
interface MetalOpts {
  size?: number;
  radius?: number;
  filled?: boolean;
  active?: boolean;
  pressed?: boolean;
  textColor?: string;
  /** Рівень глибини (ієрархія сцени): контейнер < елемент. 0.5 = м'який контейнер, 1 = звичайний, >1 = акцент. */
  strength?: number;
}
export function metal(t: ThemePalette, role: MetalRole, opts: MetalOpts = {}): any {
  const radius = opts.radius ?? 14;
  // FLAT-режим (blackout): весь метал-скін → пласкі елементи з бордером кольору тексту
  if ((t as any).flat) {
    const flatBox = {
      borderRadius: radius,
      borderWidth: 1,
      borderColor: t.primaryText,
      backgroundColor: t.surface, // FLAT blackout: без прозорості
    };
    switch (role) {
      case 'circle':
      case 'circleInset':
      case 'primary':
      case 'stamp': {
        // primary БЕЗ size = велика прямокутна кнопка (Check/Save тощо), а не кружечок
        if (role === 'primary' && opts.size == null) {
          return {
            borderRadius: radius,
            backgroundColor: t.primary,
            borderWidth: 1,
            borderColor: t.onPrimary,
            alignItems: 'center',
            justifyContent: 'center',
          };
        }
        const size = opts.size ?? 40;
        return {
          width: size,
          height: size,
          borderRadius: size / 2,
          // FLAT blackout: непрозорий фон (surface) — прозорі кнопки зливаються з екраном
          backgroundColor: role === 'primary' || (role === 'circle' && opts.filled) ? t.primary : t.surface,
          borderWidth: 1,
          borderColor: role === 'primary' || (role === 'circle' && opts.filled) ? t.onPrimary : t.primaryText,
          alignItems: 'center',
          justifyContent: 'center',
        };
      }
      case 'tabActive':
      case 'tabStampActive':
        return { ...flatBox, backgroundColor: t.primary, borderColor: t.onPrimary };
      case 'tab':
      case 'tabStamp':
        // FLAT blackout: неактивні таби з чорним фоном (прозорі зливаються з доком)
        return { borderRadius: radius, backgroundColor: t.background };
      case 'text':
        return metalText(t, opts.textColor);
      default:
        return flatBox;
    }
  }
  switch (role) {
    case 'circle':
      return neuMetalCircle(t, opts.size ?? 40, opts.filled ?? false);
    case 'circleInset':
      return neuMetalCircleInset(t, opts.size ?? 40);
    case 'primary':
      // primary БЕЗ size = велика прямокутна кнопка (Check/Save), як у FLAT-гілці вище.
      // neuMetalCircle тут давав "таблетку" (borderRadius=size/2, фіксовані 40x40).
      if (opts.size == null) return neuPrimary(t, radius);
      return neuMetalCircle(t, opts.size, true);
    case 'raised':
      return neuMetalRaised(t, radius, opts.strength ?? 1);
    case 'inset':
      return neuMetalInset(t, radius, opts.strength ?? 1);
    case 'tab':
      return metalTab(t, radius, false);
    case 'tabActive':
      return metalTab(t, radius, true);
    case 'tabStamp':
      return metalTabStamp(t, radius, false);
    case 'tabStampActive':
      return metalTabStamp(t, radius, true);
    case 'stamp':
      return metalStamp(t, opts.size ?? 36);
    case 'text':
      return metalText(t, opts.textColor);
    default:
      return neuMetalRaised(t, radius);
  }
}

// ШТАМПОВАННЫЙ МЕТАЛЛ: внешне ВДАВЛЕННАЯ «лунка» (inset well) + внутренне ВЫПУКЛЫЙ купол (convex dome).
// Убирает «грязную» размытость: блик РЕЗКИЙ, форма машиностроительная (machined metal).
// Применять к крестикам (✕), выбранным элементам и кнопкам-индикаторам.
function metalStamp(t: ThemePalette, size: number): any {
  const r = size / 2;
  const o = Math.max(2, Math.round(Math.pow(Math.max(size, 12), 0.72) * 0.5 * (t.neuScale?.depth ?? 1))); // глубина лунки — нелінійна, per-theme
  return {
    width: size,
    height: size,
    borderRadius: r,
    alignItems: 'center',
    justifyContent: 'center',
    // купол: радиальный блик сверху-слева → тёмный снизу-справа (выпуклость)
    backgroundColor: t.neu.base,
    backgroundImage: [
      `radial-gradient(80% 80% at 32% 28%, ${t.neu.hi} 0%, rgba(0,0,0,0) 55%)`,
      `linear-gradient(150deg, ${t.neu.light} 0%, ${t.neu.base} 50%, ${t.neu.dark} 100%)`,
    ].join(', '),
    backgroundClip: 'padding-box',
    transition: 'box-shadow 160ms ease, transform 160ms ease',
    boxShadow: [
      // ВНЕШНЯЯ лунка (вдавленная окантовка): тёмная сверху-слева, светлая снизу-справа
      `inset ${o}px ${o}px ${o * 2}px ${specDark(t)}`,
      `inset ${-o}px ${-o}px ${o * 2}px ${t.neu.soft}`,
      // ВНУТРЕННИЙ купол (выпуклый): светлая верхняя грань + тёмная нижняя
      `inset 0 ${Math.max(1, Math.round(o * 0.5))}px ${Math.round(o * 1.2)}px ${rim(t)}`,
      `inset 0 -${Math.max(1, Math.round(o * 0.5))}px ${Math.round(o * 1.2)}px ${specDark(t)}`,
      // холодный edge-rim
      `inset 0 0 0 1px ${rim(t)}`,
    ].join(', '),
    // Android: elevation без суцільного фону малює КВАДРАТНУ тінь поверх скруглення
    // (backgroundImage-градієнти на Android не рендеряться) → вимикаємо.
    ...(Platform.OS === 'web' ? {} : { elevation: 0 }),
  };
}

// таб в таб-баре: плоский (неактивный) или ВДАВЛЕННЫЙ металл (активный)
function metalTab(t: ThemePalette, radius: number, active: boolean): any {
  const off = Math.max(3, Math.round(radius * 0.35));
  if (!active) {
    return {
      borderRadius: radius,
      backgroundColor: 'transparent',
      transition: 'box-shadow 160ms ease, background 160ms ease',
    };
  }
  // активный: глубоко ВДАВЛЕННЫЙ металл (чёткий эффект нажатой кнопки)
  const { soft: s } = t.neu;
  const o = Math.max(5, Math.round(radius * 0.5)); // глубже, чем у неактивного
  return {
    borderRadius: radius,
    backgroundColor: t.neu.base,
    backgroundImage: metalBg(t),
    backgroundClip: 'padding-box',
    transition: 'box-shadow 160ms ease, background 160ms ease',
    boxShadow: [
      `inset ${o}px ${o}px ${o * 2.6}px ${specDark(t)}`, // глубокая тёмная грань (вдавленность)
      `inset ${-o}px ${-o}px ${o * 2.2}px ${s}`, // светлая противоположная грань
      `inset 0 1px 0 0 ${rim(t)}`,
    ].join(', '),
  };
}

// штампованный таб: ВНЕШНЕ вдавленная лунка + ВНУТРЕННЕ выпуклый купол (machined metal).
function metalTabStamp(t: ThemePalette, radius: number, active: boolean): any {
  const o = Math.max(4, Math.round(radius * 0.4));
  const { soft: s, light: l } = t.neu;
  const ix = Math.max(2, Math.round(o * 0.5));
  const iy = Math.max(2, Math.round(o * 0.5));
  const iblur = Math.round(o * 1.4);
  return {
    borderRadius: radius,
    backgroundColor: t.neu.base,
    backgroundImage: metalBg(t),
    backgroundClip: 'padding-box',
    transition: 'box-shadow 160ms ease, background 160ms ease',
    boxShadow: [
      // ВНЕШНЯЯ лунка (вдавленность): тёмная сверху-слева, светлая снизу-справа
      `inset ${o}px ${o}px ${o * 2}px ${specDark(t)}`,
      `inset ${-o}px ${-o}px ${o * 2}px ${s}`,
      // ВНУТРЕННИЙ купол (выпуклость): светлая верхняя грань + тёмная нижняя
      `inset 0 ${Math.max(1, Math.round(o * 0.5))}px ${Math.round(o * 1.2)}px ${rim(t)}`,
      `inset 0 -${Math.max(1, Math.round(o * 0.5))}px ${Math.round(o * 1.2)}px ${specDark(t)}`,
      // холодный edge-rim
      `inset 0 0 0 1px ${rim(t)}`,
    ].join(', '),
    elevation: Math.max(3, Math.round(o)),
  };
}

// металлический inset (утопленный) — для полей ввода, контейнеров
export function neuMetalInset(t: ThemePalette, radius: number, strength = 1): any {
  const sc = t.neuScale ?? { depth: 1, spread: 1 };
  // Вдавлені елементи: помірніший офсет, глибокий блюр — читається "лунка"
  // Юзер N13: inset має читатись як лунка — глибший офсет
  const off = Math.max(4, Math.round(Math.pow(Math.max(radius, 6), 0.75) * 1.9 * strength * sc.depth));
  const x = Math.max(2, Math.round(off * 0.9 * sc.spread));
  const y = Math.max(2, Math.round(off * sc.spread));
  const blur1 = Math.round(off * 2.4);
  const blur2 = Math.round(off * 4.0);
  const { soft: s, light: l } = t.neu;
  return {
    backgroundColor: t.neu.base,
    backgroundImage: metalBg(t),
    backgroundClip: 'padding-box',
    borderRadius: radius,
    // Android fallback: inset-тіні через boxShadow не рендеряться — даємо м'яку
    // зовнішню тінь через shadow*/elevation, щоб елемент не виглядав пласким
    ...(Platform.OS === 'web' ? {} : {
      shadowColor: specDark(t),
      shadowOffset: { width: x, height: y },
      shadowOpacity: 0.35,
      shadowRadius: blur1,
      elevation: Math.max(1, Math.round(off / 3)),
    }),
    boxShadow: [
      `inset ${-x}px ${-y}px ${blur1}px ${specDark(t)}`,
      `inset ${x}px ${y}px ${blur1}px ${s}`,
      `inset ${-x * 1.6}px ${-y * 1.6}px ${blur2}px ${specDark(t)}`,
      `inset 0 -1px 0 0 ${rim(t)}`,
    ].join(', '),
  };
}
