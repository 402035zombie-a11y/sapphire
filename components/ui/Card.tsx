// components/ui/Card.tsx
// Переиспользуемая металлическая карточка (raised). Заменяет размазывание
// style={[styles.x, metal(theme,'raised',{radius})]} по экранам.
import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { metal } from '../../theme/neu';

export default function Card({
  children,
  radius,
  style,
  onStartShouldSetResponder,
}: {
  children: React.ReactNode;
  radius?: number;
  style?: ViewStyle;
  onStartShouldSetResponder?: () => boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[metal(theme, 'raised', { radius: radius ?? 14 }), style]}
      onStartShouldSetResponder={onStartShouldSetResponder}
    >
      {children}
    </View>
  );
}
