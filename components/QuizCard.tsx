// components/QuizCard.tsx
// Карточка тренировки: слово + 4 варианта перевода (викторина). Неоморфическая.
import React, { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { metal } from '../theme/neu';
import { TrainingProgress } from '../store/trainingStore';
import * as Speech from 'expo-speech';
import { useT } from '../i18n';
import Icon from './Icon';
import { FONTS } from '../theme/constants';
import { matchAnyTranslation } from '../utils/translations';

export interface QuizItem {
  word: string;
  correct: string;
  options: string[];
  fromLang?: string;
  toLang?: string;
}

interface Props {
  item: QuizItem;
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
  progress?: TrainingProgress | null;
  resetKey?: string | number;
}

const speak = (text: string, lang: string) => {
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

function QuizCard({ item, onAnswer, onNext, progress, resetKey }: Props) {
  const theme = useTheme();
  const t = useT();
  const a = useAdaptive();
  const styles = React.useMemo(() => makeStyles(a, theme), [a, theme]);
  const [picked, setPicked] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    setPicked(null);
    setAnswered(false);
  }, [item.word, resetKey]);

  const choose = (opt: string) => {
    if (answered) return;
    // защита: пустая кнопка (пустой перевод) не должна засчитываться как ответ
    if (!opt || !opt.trim()) return;
    setPicked(opt);
    setAnswered(true);
    const correct = matchAnyTranslation(opt, item.correct) || opt === item.correct;
    onAnswer(correct); // записываем сразу
    setTimeout(() => onNext(), 1000);
  };

  const c = progress?.correctCount ?? 0;
  const w = progress?.wrongCount ?? 0;
  // FSRS stability (днів) замість legacy lvl-боксів — інформативніша метрика
  const stability = Math.round(progress?.stability ?? 0);

  return (
    <View style={[styles.card, metal(theme, 'raised', { radius: a.radius + 4, strength: 0.85 }), { backgroundColor: theme.surface }]}>
      <View style={styles.wordRow}>
        {stability > 0 && (
          <View style={[styles.boxBadge, metal(theme, 'inset', { radius: 8 })]}>
            <Text style={styles.boxText}>{t("{n}d").replace("{n}", String(stability))}</Text>
          </View>
        )}
        <Text style={styles.word}>{item.word}</Text>
        <TouchableOpacity style={[styles.speakBtn, metal(theme, 'speakBtn', { size: a.icon(32) })]} onPress={() => speak(item.word, item.fromLang || 'en')} hitSlop={6}>
          <Icon name="play" size={a.icon(16)} color={theme.primaryText} />
        </TouchableOpacity>
      </View>

      <Text style={styles.scoreLine}>
        <Text style={{ color: theme.success }}>✓ {c}</Text>  <Text style={{ color: theme.danger }}>✗ {w}</Text>
      </Text>

      <Text style={styles.hint}>{t("Choose the correct translation:")}</Text>
      <View style={[styles.options, a.width >= 700 && { flexDirection: 'row', flexWrap: 'wrap' }]}>
        {item.options.map((opt, i) => {
          const isPicked = picked === opt;
          const isCorrect = matchAnyTranslation(opt, item.correct) || opt === item.correct;
          const showState = answered && (isPicked || isCorrect);
          return (
            <TouchableOpacity
              key={i}
              style={[
                // Профіль 1: подвійно випуклі кнопки вибору відповіді
                metal(theme, showState && isCorrect ? 'primary' : showState && isPicked ? 'inset' : 'raised', { radius: a.radius, strength: 0.85 }),
                answered && isCorrect && { backgroundColor: theme.success },
                answered && isPicked && !isCorrect && { backgroundColor: theme.danger },
                a.width >= 700 && { flexBasis: '48%', flexGrow: 1 },
              ]}
              onPress={() => choose(opt)}
            >
              <Text
                style={[
                  styles.optionText,
                  (answered && (isCorrect || (isPicked && !isCorrect))) ? { color: theme.onPrimary, fontFamily: FONTS.bold } : { color: theme.primaryText },
                ]}
              >
                {opt}
              </Text>
              <TouchableOpacity style={[styles.speakSmall, metal(theme, 'speakBtn', { size: a.icon(28) })]} onPress={() => speak(opt, item.toLang || 'en')} hitSlop={6}>
                <Icon name="play" size={a.icon(13)} color={theme.primaryText} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default memo(QuizCard);

function makeStyles(a: ReturnType<typeof useAdaptive>, theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: { padding: a.pad, width: '100%', maxWidth: a.contentMaxW, alignSelf: 'center' },
    wordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
    word: { fontSize: a.fs(26), fontFamily: 'System', fontWeight: '700', color: theme.primaryText, textAlign: 'center', flexShrink: 1 },
    speakBtn: { padding: 0, alignItems: 'center', justifyContent: 'center' },
    speakSmall: { padding: 0, alignItems: 'center', justifyContent: 'center' },
    boxBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    boxText: { color: theme.primary, fontFamily: 'System', fontWeight: '700', fontSize: a.fs(12) },
    scoreLine: { textAlign: 'center', marginTop: 6, fontSize: a.fs(14), fontFamily: 'System', fontWeight: '700', minHeight: 20 },
    hint: { color: theme.secondaryText, textAlign: 'center', marginTop: 8, marginBottom: a.gap, fontSize: a.small_fs },
    options: { gap: Math.max(8, Math.round(a.gap * 0.8)) },
    option: {
      paddingVertical: a.tiny ? 10 : Math.round(14 * a.scale) + 2,
      paddingHorizontal: a.pad,
      borderWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: a.hit,
    },
    optionText: { fontSize: a.body, color: theme.primaryText, textAlign: 'left', flex: 1 },
  });
}
