// components/WordBottomSheet.tsx
// BottomSheet-контент по клику на слово: перевод + контекст + сохранение в словарь.
// Нативные обёртки (BottomSheetView) заменены на View ради веб-совместимости —
// на нативе этот компонент рендерится внутри BottomSheetModal, на вебе — внутри Modal.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS, SIZES, FONTS } from '../theme/constants';
import { useSettingsStore } from '../store/settingsStore';
import { translateCached } from '../services/translationService';
import { useDictionaryStore } from '../store/dictionaryStore';
import { normalizeWord } from '../utils/wordTokenizer';

interface Props {
  word: string | null;
  sentence: string;
  lang: string;
  onClose: () => void;
}

export default function WordBottomSheet({ word, sentence, lang, onClose }: Props) {
  const targetLang = useSettingsStore((s) => s.targetLang);
  const addEntry = useDictionaryStore((s) => s.addEntry);
  const hasWord = useDictionaryStore((s) => s.hasWord);

  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!word) return;
    let active = true;
    setLoading(true);
    setSaved(false);
    setTranslation('');
    const from = lang === 'auto' ? 'auto' : lang;
    translateCached(word, from, targetLang)
      .then((r) => active && setTranslation(r.text))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [word, lang, targetLang]);

  const onSave = useCallback(() => {
    if (!word) return;
    const norm = normalizeWord(word);
    if (hasWord(norm)) {
      setSaved(true);
      return;
    }
    addEntry({
      word: norm,
      surfaceForm: word,
      translation,
      context: sentence,
      lang: lang === 'auto' ? 'en' : lang,
    });
    setSaved(true);
  }, [word, translation, sentence, lang, addEntry, hasWord]);

  if (!word) return null;

  return (
    <View style={styles.sheet}>
      <Text style={styles.word}>{word}</Text>
      {loading ? (
        <ActivityIndicator color={COLORS.secondaryText} style={styles.indicator} />
      ) : (
        <Text style={styles.translation}>{translation}</Text>
      )}
      <Text style={styles.contextLabel}>Контекст:</Text>
      <Text style={styles.context}>{sentence}</Text>
      <TouchableOpacity
        style={[styles.saveBtn, (saved || hasWord(normalizeWord(word))) && styles.savedBtn]}
        onPress={onSave}
        disabled={saved}
      >
        <Text style={styles.saveText}>{saved ? 'В словаре ✓' : 'Сохранить в словарь'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeText}>Закрыть</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: COLORS.background, padding: SIZES.padding, gap: 10 },
  word: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.primaryText },
  translation: { fontSize: 18, color: COLORS.primary, lineHeight: 24 },
  indicator: { marginVertical: 8 },
  contextLabel: { color: COLORS.secondaryText, fontSize: 13, marginTop: 6 },
  context: { color: COLORS.secondaryText, fontSize: 14, lineHeight: 20 },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    marginTop: 8,
  },
  savedBtn: { backgroundColor: COLORS.success },
  saveText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 15 },
  closeBtn: { alignItems: 'center', paddingVertical: 8 },
  closeText: { color: COLORS.secondaryText },
});
