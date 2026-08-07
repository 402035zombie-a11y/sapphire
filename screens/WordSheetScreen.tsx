// screens/WordSheetScreen.tsx
// Временный экран-заглушка выбранного слова (полноценный BottomSheet — в Шаге 4).
// Показывает слово, переводит его и позволяет сохранить в словарь.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { COLORS, SIZES, FONTS } from '../theme/constants';
import { useSettingsStore } from '../store/settingsStore';
import { translateCached } from '../services/translationService';
import { useDictionaryStore } from '../store/dictionaryStore';
import { normalizeWord } from '../utils/wordTokenizer';

interface Params {
  word: string;
  sentence: string;
  lang: string;
}

export default function WordSheetScreen() {
  const route = useRoute();
  const { word, sentence, lang } = route.params as Params;
  const targetLang = useSettingsStore((s) => s.targetLang);
  const addEntry = useDictionaryStore((s) => s.addEntry);
  const hasWord = useDictionaryStore((s) => s.hasWord);

  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const from = lang === 'auto' ? 'auto' : lang;
    translateCached(word, from, targetLang)
      .then((r) => active && setTranslation(r.text))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [word, lang, targetLang]);

  const save = () => {
    addEntry({
      word: normalizeWord(word),
      surfaceForm: word,
      translation,
      context: sentence,
      lang: lang === 'auto' ? 'en' : lang,
    });
    setSaved(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.word}>{word}</Text>
        {loading ? (
          <ActivityIndicator color={COLORS.secondaryText} />
        ) : (
          <Text style={styles.translation}>{translation}</Text>
        )}
        <Text style={styles.context}>{sentence}</Text>

        <TouchableOpacity
          style={[styles.saveBtn, (saved || hasWord(normalizeWord(word))) && styles.savedBtn]}
          onPress={save}
          disabled={saved}
        >
          <Text style={styles.saveText}>{saved ? 'В словаре ✓' : 'Сохранить в словарь'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SIZES.padding, justifyContent: 'flex-end' },
  card: { backgroundColor: COLORS.surface, borderRadius: SIZES.radius, padding: SIZES.padding },
  word: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.primaryText },
  translation: { fontSize: 18, color: COLORS.primary, marginTop: 6 },
  context: { color: COLORS.secondaryText, marginTop: 12, fontSize: 14, lineHeight: 20 },
  saveBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: SIZES.radius, marginTop: SIZES.gap, alignItems: 'center' },
  savedBtn: { backgroundColor: COLORS.success },
  saveText: { color: '#fff', fontFamily: FONTS.bold },
});
