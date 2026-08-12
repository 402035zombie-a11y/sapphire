// components/BackFab.tsx
// Плавающая круглая кнопка «назад»: вместо пустого нативного хедера.
// Экономит вертикальное место, но возврат остаётся доступен в любом режиме.
import React from 'react';
import { TouchableOpacity, View, Platform } from 'react-native';
import Icon from './Icon';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { metal, neuShadowPad, screenBg, metalText } from '../theme/neu';

export default function BackFab({
  onPress,
  size,
  top,
  left,
}: {
  onPress?: () => void;
  size?: number;
  top?: number;
  left?: number;
}) {
  const theme = useTheme();
  const a = useAdaptive();
  const s = size ?? a.fab();
  const pad = Math.max(10, a.pad); // пропорциональный отступ от стен (не менее 10)
  const safeTop = Platform.OS === 'ios' ? 8 : 0;
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={10}
      style={[
        metal(theme, 'circle', { size: s }),
        {
          position: 'absolute',
          top: (top ?? pad) + safeTop,
          left: left ?? pad,
          zIndex: 50,
        },
      ]}
    >
      <Icon name="arrow-back" size={Math.round(s * 0.5)} color={theme.primaryText} />
      <View />
    </TouchableOpacity>
  );
}
