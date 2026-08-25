// components/WordActionSheet.tsx
// Попап дій по слову у звичайному режимі читання (mode='read').
// Показує слово, озвучення слова, копіювання, переклад та кнопку збереження у словник.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform, Clipboard } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/constants';
import { useAdaptive } from '../theme/useAdaptive';
import Icon from './Icon';
import { metal } from '../theme/neu';
import { useT } from '../i18n';
import ModalSheet from './ModalSheet';
import { translateCached, translationErrorMessage } from '../services/translationService';
import { effectiveLang } from '../utils/lang';
import { useDictionaryStore } from '../store/dictionaryStore';
import { normalizeWord } from '../utils/wordTokenizer';
import * as Speech from 'expo-speech';

interface Props {
  visible: boolean;
  word: string;
  sentence: string;
  lang?: string;
  targetLang?: string;
  bookId?: string;
  onClose: () => void;
}

const speakWord = (text: string, lang: string) => {
  if (!text) return;
  if (Platform.OS === 'web' && 'speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang || 'en';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } else {
    Speech.stop();
    Speech.speak(text, { language: lang || 'en', rate: 0.95 });
  }
};

export default function WordActionSheet({ visible, word, sentence, lang = 'en', targetLang = 'uk', bookId, onClose }: Props) {
  const theme = useTheme();
  const t = useT();
  const a = useAdaptive();
  const addEntry = useDictionaryStore((s) => s.addEntry);
  const hasWord = useDictionaryStore((s) => s.hasWord);

  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [translationError, setTranslationError] = useState('');

  useEffect(() => {
    if (!word || !visible) return;
    let active = true;
    setLoading(true);
    setSaved(false);
    setCopied(false);
    setTranslation('');
    setTranslationError('');
    const from = effectiveLang(lang);

    translateCached(word, from, targetLang)
      .then((r) => active && setTranslation(r.text))
      .catch((e) => {
        console.warn('[WordActionSheet] word translation failed', e);
        if (active) setTranslationError(translationErrorMessage(e));
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [word, lang, targetLang, visible]);

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
      lang: effectiveLang(lang),
      bookId,
      frequency: 1,
    });
    setSaved(true);
  }, [word, translation, sentence, lang, addEntry, hasWord, bookId]);

  const onCopy = useCallback(() => {
    if (!word) return;
    Clipboard.setString(word);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [word]);

  if (!word) return null;

  const isKnown = saved || hasWord(normalizeWord(word));
  const fromLang = effectiveLang(lang);

  const btnBase = [
    metal(theme, 'circle', { size: a.icon(36) }),
    {
      width: a.icon(36),
      height: a.icon(36),
      borderRadius: a.radius,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: 0,
    },
  ];

  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <View style={{ width: '100%', gap: a.gap }}>
        {/* Верх: слово + копіювати + озвучити слово + закрити */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontSize: a.fs(22), fontFamily: FONTS.bold, color: theme.primaryText, flex: 1 }} numberOfLines={2}>
            {word}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={() => speakWord(word, fromLang)} hitSlop={8} style={btnBase}>
              <Icon name="play" size={a.icon(16)} color={theme.primaryText} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onCopy} hitSlop={8} style={btnBase}>
              <Icon name={copied ? "check" : "copy"} size={a.icon(16)} color={copied ? theme.success : theme.primaryText} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} hitSlop={8} style={btnBase}>
              <Icon name="close" size={a.icon(18)} color={theme.secondaryText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Переклад слова */}
        {loading ? (
          <ActivityIndicator color={theme.secondaryText} style={{ marginVertical: 12 }} />
        ) : translation ? (
          <View style={{ marginVertical: 4 }}>
            <Text style={{ fontSize: a.small_fs, marginBottom: 2, color: theme.secondaryText }}>{t("Translation:")}</Text>
            <Text style={{ fontSize: a.h2, fontFamily: FONTS.bold, color: theme.primary }}>{translation}</Text>
          </View>
        ) : translationError ? (
          <Text style={{ color: theme.danger ?? theme.primaryText, fontSize: a.small_fs, marginVertical: 8 }}>
            {translationError}
          </Text>
        ) : null}

        {/* Низ: кнопка збереження */}
        <TouchableOpacity
          style={[
            isKnown
              ? { ...metal(theme, 'raised', { radius: a.radius }), backgroundColor: theme.surface, borderColor: theme.success, borderWidth: 1 }
              : { ...metal(theme, 'primary', { radius: a.radius }), backgroundColor: theme.primary },
            {
              paddingVertical: Math.max(10, Math.round(13 * a.scale)),
              alignItems: 'center',
              marginTop: 4,
            },
          ]}
          onPress={onSave}
          disabled={saved}
        >
          <Text style={{ color: isKnown ? theme.success : theme.onPrimary, fontFamily: FONTS.bold, fontSize: a.body }}>
            {saved || isKnown ? `✓ ${t("In dictionary")}` : t("Save to dictionary")}
          </Text>
        </TouchableOpacity>
      </View>
    </ModalSheet>
  );
}
