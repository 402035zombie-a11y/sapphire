// components/WordBottomSheet.tsx
// Попап по слову (по референсу SmartBook): заголовок + транскрипция + часть речи (синяя)
// + перевод + примеры + ряд иконок действий.
// Транскрипцию/часть речи/примеры берём из бесплатного Free Dictionary API (en).
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { translateCached } from '../services/translationService';
import { useDictionaryStore } from '../store/dictionaryStore';
import { normalizeWord } from '../utils/wordTokenizer';
import { effectiveLang } from '../utils/lang';
import Icon from '../components/Icon';
import { metal, neuShadowPad, screenBg, metalText } from '../theme/neu';
import { useT } from '../i18n';
import ModalSheet from './ModalSheet';

interface Props {
  word: string | null;
  sentence: string;
  lang: string;
  targetLang: string;
  bookId?: string;
  onClose: () => void;
}

interface DictMeaning {
  partOfSpeech: string;
  definitions: { definition: string; example?: string }[];
  phonetic?: string;
}

export default function WordBottomSheet({ word, sentence, lang, targetLang, bookId, onClose }: Props) {
  const theme = useTheme();
  const t = useT();
  const a = useAdaptive();
  const addEntry = useDictionaryStore((s) => s.addEntry);
  const hasWord = useDictionaryStore((s) => s.hasWord);

  const [translation, setTranslation] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [meanings, setMeanings] = useState<DictMeaning[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!word) return;
    let active = true;
    setLoading(true);
    setSaved(false);
    setTranslation('');
    setPhonetic('');
    setMeanings([]);
    const from = effectiveLang(lang);
    // перевод слова целиком
    translateCached(word, from, targetLang).then((r) => active && setTranslation(r.text)).catch((e) => console.warn('[WordBottomSheet] word translation failed', e));
    // словарная статья (en) — бесплатный Free Dictionary API
    if (from === 'en') {
      fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then(async (data) => {
          if (!active || !Array.isArray(data)) return;
          const entry = data[0];
          const phonetic = entry?.phonetic ?? entry?.phonetics?.find((p: any) => p.text)?.text ?? '';
          const rawMeanings: DictMeaning[] = (entry?.meanings ?? []).map((m: any) => ({
            partOfSpeech: m.partOfSpeech,
            phonetic: '',
            definitions: (m.definitions ?? []).slice(0, 3).map((d: any) => ({
              definition: d.definition,
              example: d.example,
            })),
          }));
          // переводим дефиниции и примеры на язык перевода (targetLang), а не показываем оригинал
          const translated = await Promise.all(
            rawMeanings.map(async (m) => ({
              ...m,
              definitions: await Promise.all(
                m.definitions.map(async (d) => ({
                  definition: (await translateCached(d.definition, 'en', targetLang)).text || d.definition,
                  example: d.example
                    ? (await translateCached(d.example, 'en', targetLang)).text || d.example
                    : undefined,
                })),
              ),
            })),
          );
          if (!active) return;
          setPhonetic(phonetic);
          setMeanings(translated);
        })
        .catch((e) => console.warn('[WordBottomSheet] dictionary article fetch failed', e))
        .finally(() => active && setLoading(false));
    } else {
      setLoading(false);
    }
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
  }, [word, translation, sentence, lang, addEntry, hasWord]);

  if (!word) return null;

  const isKnown = saved || hasWord(normalizeWord(word));

  return (
    <ModalSheet
      visible={true}
      onClose={onClose}
      variant="sheet"
      panelStyle={{
        backgroundColor: theme.popupBg ?? theme.neu.base,
        padding: a.pad,
        gap: Math.round(a.gap * 0.8),
        maxWidth: a.isDesktop ? 640 : undefined,
      }}
    >
      <View style={{ width: '100%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <Text style={{ fontSize: a.fs(26), fontFamily: 'bold', color: theme.primaryText }}>{word}</Text>
            {phonetic ? <Text style={{ fontSize: a.body, color: theme.secondaryText }}> [{phonetic}]</Text> : null}
          </View>
          <TouchableOpacity style={[metal(theme, 'stamp', { size: a.fab() }), { padding: 0 }]} onPress={onClose} hitSlop={12}>
            <Icon name="close" size={a.icon(22)} color={theme.secondaryText} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={theme.secondaryText} style={{ marginVertical: 12 }} />
        ) : (
          <ScrollView style={{ maxHeight: a.height * (a.landscape ? 0.5 : 0.48) }} showsVerticalScrollIndicator={false}>
          {meanings.map((m, i) => (
            <View key={i} style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: a.body, fontFamily: 'bold', marginBottom: 4, color: theme.posColor }}>{m.partOfSpeech}</Text>
              {m.definitions.map((d, j) => (
                <View key={j} style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: a.body, lineHeight: a.body * 1.4, color: theme.primaryText }}>• {d.definition}</Text>
                  {d.example ? (
                    <Text style={{ fontSize: a.small_fs, fontStyle: 'italic', marginTop: 2, lineHeight: a.small_fs * 1.4, color: theme.secondaryText }}>
                      «{d.example}»
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ))}
          {translation ? (
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#00000010' }}>
              <Text style={{ fontSize: a.small_fs, marginBottom: 2, color: theme.secondaryText }}>{t("Translation:")}</Text>
              <Text style={{ fontSize: a.h2, fontFamily: 'bold', color: theme.posColor }}>{translation}</Text>
            </View>
          ) : null}
          {sentence ? (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: a.small_fs, marginBottom: 2, color: theme.secondaryText }}>{t("Context:")}</Text>
              <Text style={{ fontSize: a.fs(14), lineHeight: a.fs(14) * 1.45, color: theme.secondaryText }}>{sentence}</Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: a.tiny ? 4 : 8, gap: 8 }}>
        <TouchableOpacity style={[metal(theme, 'stamp', { size: a.fab() }), { padding: 0 }]} onPress={onSave}>
          <Icon name="star" size={a.icon(22)} color={theme.primaryText} />
        </TouchableOpacity>
        <View style={[metal(theme, 'stamp', { size: a.fab() }), { padding: 0 }]}>
          <Icon name="language" size={a.icon(22)} color={theme.primaryText} />
        </View>
        <TouchableOpacity style={[metal(theme, 'stamp', { size: a.fab() }), { padding: 0 }]}>
          <Icon name="volume" size={a.icon(22)} color={theme.primaryText} />
        </TouchableOpacity>
        <TouchableOpacity style={[metal(theme, 'stamp', { size: a.fab() }), { padding: 0 }]}>
          <Icon name="copy" size={a.icon(22)} color={theme.primaryText} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          isKnown ? metal(theme, 'raised', { radius: a.radius }) : metal(theme, 'primary', { size: a.radius }),
          isKnown ? { backgroundColor: theme.success } : {},
          {
            paddingVertical: Math.max(10, Math.round(14 * a.scale)),
            alignItems: 'center',
            marginTop: 4,
          },
        ]}
        onPress={onSave}
        disabled={saved}
      >
        <Text style={{ color: theme.primaryText, fontFamily: 'bold', fontSize: a.body }}>{saved ? t("In dictionary ✓") : t("Save to dictionary")}</Text>
      </TouchableOpacity>
    </View>
    </ModalSheet>
  );
}
