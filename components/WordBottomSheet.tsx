// components/WordBottomSheet.tsx
// Модальне вікно слова: заголовок + озвучення + копіювання + переклад + контекст + кнопка збереження
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Platform, Clipboard } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { translateCached, translationErrorMessage } from '../services/translationService';
import { useDictionaryStore } from '../store/dictionaryStore';
import { normalizeWord } from '../utils/wordTokenizer';
import { effectiveLang } from '../utils/lang';
import Icon from '../components/Icon';
import { surface } from '../theme/neu';
import { useT } from '../i18n';
import { FONTS } from '../theme/constants';
import ModalSheet from './ModalSheet';
import * as Speech from 'expo-speech';

interface Props {
  word: string | null;
  sentence: string;
  lang: string;
  targetLang: string;
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

export default function WordBottomSheet({ word, sentence, lang, targetLang, bookId, onClose }: Props) {
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
    if (!word) return;
    let active = true;
    setLoading(true);
    setSaved(false);
    setCopied(false);
    setTranslation('');
    setTranslationError('');
    const from = effectiveLang(lang);
    
    // Переклад слова
    translateCached(word, from, targetLang)
      .then((r) => active && setTranslation(r.text))
      .catch((e) => {
        console.warn('[WordBottomSheet] word translation failed', e);
        if (active) setTranslationError(translationErrorMessage(e));
      })
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

  const actionBtnStyle = [
    surface(theme, 'circle', { size: a.icon(36) }),
    { width: a.icon(36), height: a.icon(36), padding: 0, alignItems: 'center' as const, justifyContent: 'center' as const }
  ];

  return (
    <ModalSheet
      visible={true}
      onClose={onClose}
      variant="sheet"
      panelStyle={{
        backgroundColor: theme.surface,
        padding: a.pad,
        gap: Math.round(a.gap * 0.8),
        maxWidth: a.isDesktop ? 640 : undefined,
      }}
    >
      <View style={{ width: '100%', gap: a.gap }}>
        {/* Верхній ряд: Слово + Озвучення + Копіювання + Закрити */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontSize: a.fs(22), fontFamily: FONTS.bold, color: theme.primaryText, flex: 1 }} numberOfLines={2}>
            {word}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity style={actionBtnStyle} onPress={() => speakWord(word, fromLang)} hitSlop={8}>
              <Icon name="play" size={a.icon(16)} color={theme.primaryText} />
            </TouchableOpacity>
            <TouchableOpacity style={actionBtnStyle} onPress={onCopy} hitSlop={8}>
              <Icon name={copied ? "check" : "copy"} size={a.icon(16)} color={copied ? theme.success : theme.primaryText} />
            </TouchableOpacity>
            <TouchableOpacity style={actionBtnStyle} onPress={onClose} hitSlop={8}>
              <Icon name="close" size={a.icon(18)} color={theme.secondaryText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Контент: Переклад та Контекст */}
        {loading ? (
          <ActivityIndicator color={theme.secondaryText} style={{ marginVertical: 16 }} />
        ) : (
          <ScrollView style={{ maxHeight: a.height * 0.35 }} showsVerticalScrollIndicator={false}>
            {translation ? (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: a.small_fs, marginBottom: 2, color: theme.secondaryText }}>{t("Translation:")}</Text>
                <Text style={{ fontSize: a.h2, fontFamily: FONTS.bold, color: theme.primary }}>{translation}</Text>
              </View>
            ) : null}
            {!translation && translationError ? (
              <Text style={{ color: theme.danger ?? theme.primaryText, fontSize: a.small_fs, marginBottom: 10 }}>
                {translationError}
              </Text>
            ) : null}
            {sentence ? (
              <View style={{ marginTop: 4 }}>
                <Text style={{ fontSize: a.small_fs, marginBottom: 2, color: theme.secondaryText }}>{t("Context:")}</Text>
                <Text style={{ fontSize: a.body, lineHeight: a.body * 1.45, color: theme.secondaryText }}>{sentence}</Text>
              </View>
            ) : null}
          </ScrollView>
        )}

        {/* Низ: Кнопка збереження у словник */}
        <TouchableOpacity
          style={[
            isKnown
              ? { ...surface(theme, 'raised', { radius: a.radius }), backgroundColor: theme.surface, borderColor: theme.success, borderWidth: 1 }
              : { ...surface(theme, 'primary', { radius: a.radius }), backgroundColor: theme.primary },
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
