// components/Toggle.tsx
// Тумблер (switch) для настроек. Размер масштабируется под экран. Неоморфический.
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { neuInset, neuRaised } from '../theme/neu';

export default function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  const theme = useTheme();
  const a = useAdaptive();
  const h = Math.round(Math.max(22, Math.min(30, 26 * a.scale)));
  const w = Math.round(h * 1.7);
  const thumb = h - 6;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      style={[
        neuInset(theme, h / 2),
        {
          width: w,
          height: h,
          padding: 3,
          justifyContent: 'center',
        },
      ]}
    >
      <View
        style={[
          neuRaised(theme, thumb / 2),
          {
            width: thumb,
            height: thumb,
            borderRadius: thumb / 2,
            backgroundColor: value ? theme.primary : theme.neu.base,
            transform: [{ translateX: value ? w - thumb - 6 : 0 }],
          },
        ]}
      />
    </TouchableOpacity>
  );
}
