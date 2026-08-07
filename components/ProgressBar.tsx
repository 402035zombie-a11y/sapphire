// components/ProgressBar.tsx
// Простая шкала загрузки (0..1).
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../theme/constants';

export default function ProgressBar({ progress }: { progress: number }) {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${p * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: COLORS.primary },
});
