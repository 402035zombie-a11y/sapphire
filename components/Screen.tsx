// components/Screen.tsx
// Единый корень экрана. Решает ДВЕ системные проблемы разом:
//  1. Фон (screenBg) рисуется на absoluteFill-слое -> разойдётся на ВЕСЬ viewport
//     (включая поля по бокам на ультра-широких и «под блоком главного меню»),
//     а не обрезается по maxWidth контейнера.
//  2. Контент центрируется (maxWidth + alignSelf:center) как раньше делал `container`,
//     но без дублирования кода в каждом экране.
// Провайдеры (GestureHandlerRootView/SafeArea/Theme) уже на уровне App.tsx — сюда не дублируем.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { screenBg } from '../theme/neu';

export default function Screen({
  children,
  contentStyle,
  bg = true,
  bgStyle,
}: {
  children: React.ReactNode;
  contentStyle?: any;
  bg?: boolean;
  bgStyle?: any;
}) {
  const theme = useTheme();
  const a = useAdaptive();
  return (
    <View style={{ flex: 1 }}>
      {bg && <View style={[StyleSheet.absoluteFill, { ...screenBg(theme), backgroundColor: theme.background }, bgStyle, { pointerEvents: "none" as any }]} />}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    width: '100%',
    maxWidth: undefined, // переопределяется через contentStyle (a.contentMaxW)
    alignSelf: 'center',
  },
});
