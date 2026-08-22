// components/ui/Chip.tsx
// Металлический чип/тег (inset). Для языковых меток, бейджей и т.п.
import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { metal } from '../../theme/neu';

export default function Chip({
  label,
  onPress,
  active,
  radius,
  style,
  textStyle,
}: {
  label: string;
  onPress?: () => void;
  active?: boolean;
  radius?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
}) {
  const theme = useTheme();
  const Comp = onPress ? require('react-native').TouchableOpacity : View;
  return (
    <Comp
      onPress={onPress}
      style={[
        metal(theme, active ? 'tabActive' : 'inset', { radius: radius ?? 10 }),
        { paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <Text style={[{ fontSize: 13, color: active ? theme.primary : theme.secondaryText }, textStyle]}>{label}</Text>
    </Comp>
  );
}
