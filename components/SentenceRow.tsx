// components/SentenceRow.tsx
// Одна строка: оригинал + параллельный перевод (если готов) или кнопка «перевести».
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, SIZES, FONTS } from '../theme/constants';

interface Props {
  index: number;
  original: string;
  translation?: string;
  loading?: boolean;
  onTranslate: (index: number) => void;
  onWordPress: (word: string, sentence: string) => void;
}

// разбиваем предложение на кликабельные токены (слова/пунктуация)
function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter((t) => t.length > 0);
}

export default function SentenceRow({
  index,
  original,
  translation,
  loading,
  onTranslate,
  onWordPress,
}: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.original}>
        {tokenize(original).map((tok, i) =>
          /^[^\s]+$/.test(tok) && /[A-Za-zА-Яа-яЁё]/.test(tok) ? (
            <TouchableOpacity key={i} onPress={() => onWordPress(tok, original)}>
              <Text style={styles.word}>{tok}</Text>
            </TouchableOpacity>
          ) : (
            <Text key={i} style={styles.word}>
              {tok}
            </Text>
          ),
        )}
      </View>

      {translation ? (
        <Text style={styles.translation}>{translation}</Text>
      ) : loading ? (
        <ActivityIndicator style={styles.indicator} color={COLORS.secondaryText} />
      ) : (
        <TouchableOpacity style={styles.translateBtn} onPress={() => onTranslate(index)}>
          <Text style={styles.translateText}>Перевести</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: SIZES.gap },
  original: { flexDirection: 'row', flexWrap: 'wrap' },
  word: { fontSize: 16, color: COLORS.primaryText, lineHeight: 24 },
  translation: { fontSize: 15, color: COLORS.secondaryText, marginTop: 4, lineHeight: 22 },
  translateBtn: { alignSelf: 'flex-start', marginTop: 4 },
  translateText: { color: COLORS.primary, fontSize: 14 },
  indicator: { marginTop: 6, alignSelf: 'flex-start' },
});
