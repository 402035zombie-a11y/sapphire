// components/Icon.tsx
// Собственные SVG-иконки (без шрифтов) — рендерятся везде (web/native), без «неизвестных значков».
import React, { memo } from 'react';
import Svg, { Path, Circle, Line, Rect, Polygon } from 'react-native-svg';
import { TouchableOpacity } from 'react-native';

export type IconName =
  | 'arrow-back'
  | 'home'
  | 'book'
  | 'bookmark'
  | 'bookmark-filled'
  | 'school'
  | 'settings'
  | 'menu'
  | 'search'
  | 'chevron-forward'
  | 'chevron-down'
  | 'star'
  | 'star-filled'
  | 'language'
  | 'list'
  | 'play'
  | 'copy'
  | 'volume'
  | 'check'
  | 'close'
  | 'plus'
  | 'scan'
  | 'options'
  | 'stats'
  | 'exit'
  | 'bolt'
  | 'pause'
  | 'heart'
  | 'chevron-back'
  | 'chevron-forward-2'
  | 'refresh'
  | 'swap';

const PATHS: Record<IconName, React.ReactNode> = {
  'arrow-back': <Path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z" />,
  home: (
    <>
      <Path d="M12 3l9 8h-3v9h-4v-6H10v6H6v-9H3z" />
    </>
  ),
  book: (
    <>
      <Path d="M4 4h7a2 2 0 0 1 2 2v13a1 1 0 0 0-1-1H4z" />
      <Path d="M20 4h-7a2 2 0 0 0-2 2v13a1 1 0 0 1 1-1h8z" />
    </>
  ),
  bookmark: <Path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />,
  'bookmark-filled': <Path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" fill="currentColor" />,
  school: (
    <>
      <Path d="M12 3L2 8l10 5 10-5z" />
      <Path d="M6 11v5c0 1 3 3 6 3s6-2 6-3v-5" />
    </>
  ),
  settings: (
    <Path
      d="M19.14 12.94a7.49 7.49 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.3 7.3 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.49 7.49 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  menu: <Path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" fill="none" />,
  search: (
    <>
      <Circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <Line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  'chevron-forward': <Path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" />,
  'chevron-down': <Path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />,
  star: <Path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" fill="none" stroke="currentColor" strokeWidth="1.5" />,
  'star-filled': <Path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" fill="currentColor" />,
  language: (
    <>
      <Circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <Path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  list: <Path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" fill="none" />,
  play: <Polygon points="9,5 21,12 9,19" fill="currentColor" />,
  copy: (
    <>
      <Rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <Path d="M5 15V5a2 2 0 0 1 2-2h8" fill="none" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  volume: <Path d="M4 9v6h4l5 4V5L8 9zM16 8a4 4 0 0 1 0 8" fill="none" stroke="currentColor" strokeWidth="2" />,
  check: <Path d="M5 12l5 5 9-11" fill="none" stroke="currentColor" strokeWidth="2.5" />,
  close: <Path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" />,
  plus: <Path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" />,
  scan: <Path d="M3 7V3h4M17 3h4v4M21 17v4h-4M7 21H3v-4M3 12h18" fill="none" stroke="currentColor" strokeWidth="2" />,
  options: <Path d="M4 7h16M4 12h16M4 17h16M9 7v0M14 12v0M7 17v0" stroke="currentColor" strokeWidth="2" />,
  stats: <Path d="M4 20V10M10 20V4M16 20v-8M22 20H2" fill="none" stroke="currentColor" strokeWidth="2" />,
  exit: <Path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l4-4-4-4M14 12H3" fill="none" stroke="currentColor" strokeWidth="2" />,
  bolt: <Path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor" />,
  pause: <Path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" />,
  heart: <Path d="M12 21s-7-4.5-9.5-9C.5 8 2.5 4 6 4c2 0 3.2 1.2 4 2.5C10.8 5.2 12 4 14 4c3.5 0 5.5 4 3.5 8-2.5 4.5-9.5 9-9.5 9z" stroke="currentColor" strokeWidth="2" fill="none" />,
  'chevron-back': <Path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" />,
  'chevron-forward-2': <Path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" />,
  refresh: (
    <>
      <Path d="M21 12a9 9 0 1 1-3-6.7" fill="none" stroke="currentColor" strokeWidth="2" />
      <Path d="M21 4v5h-5" fill="none" stroke="currentColor" strokeWidth="2" />
      <Path d="M3 12a9 9 0 1 0 3-6.7" fill="none" stroke="currentColor" strokeWidth="2" />
      <Path d="M3 20v-5h5" fill="none" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  swap: (
    <>
      <Path d="M7 7h12l-3-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 17H5l3 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

// Контуры (stroke) для гравировки (engrave): тёмная/светлая обводка с offset-ом
const PATHS_D: Partial<Record<IconName, string>> = {
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5 9-11',
  play: 'M7 5l12 7-12 7z',
};

function Icon({ name, size = 24, color = '#000', onPress, emboss }: { name: IconName; size?: number; color?: string; onPress?: () => void; emboss?: boolean }) {
  const svg = (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      stroke="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {emboss && PATHS_D[name] ? (
        // объёмный (выпуклый) знак: тень снизу-справа + блик сверху-слева → «выдавленный» значок
        <g>
          <Path d={PATHS_D[name]} transform="translate(1,1)" stroke="rgba(0,0,0,0.28)" strokeWidth="2.5" fill="none" />
          <Path d={PATHS_D[name]} transform="translate(-1,-1)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" fill="none" />
          <Path d={PATHS_D[name]} stroke={color} strokeWidth="2.5" fill="none" />
        </g>
      ) : (
        PATHS[name]
      )}
    </Svg>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} hitSlop={6} style={{ padding: 2 }}>
        {svg}
      </TouchableOpacity>
    );
  }
  return svg;
}

// Мемоизируем: Icon — листовой компонент, используется повсеместно (хедеры, попапы,
// WordBottomSheet и т.д.). Без memo каждый ре-рендер родителя пересобирает все SVG-дерево
// иконки. Пропсы примитивны (name/size/color/emboss) — shallow compare дешёв; onPress
// (если передан инлайн) корректно форсирует ре-рендер.
export default memo(Icon);
