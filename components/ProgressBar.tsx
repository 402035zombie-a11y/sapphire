// components/ProgressBar.tsx
// Шкала загрузки (0..1). Неоморфическая «утопленная дорожка» + заливка primary.
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { neuInset } from '../theme/neu';

export default function ProgressBar({ progress }: { progress: number }) {
  const p = Math.max(0, Math.min(1, progress));
  const theme = useTheme();
  const a = useAdaptive();
  const h = Math.round(Math.max(6, Math.min(10, 8 * a.scale)));
  return (
    <View
      style={[
        neuInset(theme, h / 2),
        { height: h, overflow: 'hidden' },
      ]}
    >
      <View style={{ height: '100%', width: `${p * 100}%`, backgroundColor: theme.primary, borderRadius: h / 2 }} />
    </View>
  );
}
