// components/ui/Button.tsx
// Металлическая кнопка. variant: 'primary' (выпуклая залитая) | 'inset' (вдавленная).
// Заменяет style={[styles.x, metal(theme,'primary'|'inset',{...})]} + TouchableOpacity.
import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { metal } from '../../theme/neu';

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size,
  radius,
  style,
  textStyle,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'inset';
  size?: number;
  radius?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const role = variant === 'primary' ? 'primary' : 'inset';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        metal(theme, role, { size, radius: radius ?? 12 }),
        { alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <Text style={[{ color: variant === 'primary' ? theme.primaryText : theme.primaryText, fontFamily: 'System', fontWeight: '700' }, textStyle]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
