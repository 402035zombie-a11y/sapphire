// components/ui/TextField.tsx
// Металлическое поле ввода (inset). Заменяет TextInput с metal(theme,'inset',{radius}).
import React from 'react';
import { TextInput, TextInputProps, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { metal } from '../../theme/neu';

export default function TextField({
  radius,
  style,
  ...rest
}: { radius?: number; style?: ViewStyle } & TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      style={[
        metal(theme, 'inset', { radius: radius ?? 10 }),
        { borderWidth: 0, color: theme.primaryText, paddingHorizontal: 12, paddingVertical: 10 },
        style,
      ]}
      placeholderTextColor={theme.secondaryText}
      {...rest}
    />
  );
}
