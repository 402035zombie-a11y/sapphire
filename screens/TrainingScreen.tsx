import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../theme/constants';

export default function TrainingScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.text}>Тренировка (заглушка)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, padding: SIZES.padding },
  text: { color: COLORS.secondaryText, fontSize: 16 },
});
