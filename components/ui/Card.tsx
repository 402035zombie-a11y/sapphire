// components/ui/Card.tsx
// Переиспользуемая металлическая карточка (raised). Заменяет размазывание
// style={[styles.x, surface(theme,'raised',{radius})]} по экранам.
import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { surface } from '../../theme/neu';

export default function Card({
  children,
  radius,
  style,
  onStartShouldSetResponder,
}: {
  children: React.ReactNode;
  radius?: number;
  style?: ViewStyle | ViewStyle[];
  onStartShouldSetResponder?: () => boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[surface(theme, 'raised', { radius: radius ?? 14, strength: 0.6 }), style]}
      onStartShouldSetResponder={onStartShouldSetResponder}
    >
      {children}
    </View>
  );
}
