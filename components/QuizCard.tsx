// components/QuizCard.tsx
// Карточка тренировки: слово + 4 варианта перевода (викторина). Неоморфическая.
import React, { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { metal, neuShadowPad, screenBg, metalText } from '../theme/neu';
import { TrainingProgress } from '../store/trainingStore';
import { useT } from '../i18n';

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
  if (Platform.OS === 'web' && 'speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang || 'en';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
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
    const correct = opt === item.correct;
    onAnswer(correct); // записываем сразу
    setTimeout(() => onNext(), 1000);
  };

  const c = progress?.correctCount ?? 0;
  const w = progress?.wrongCount ?? 0;
  // FSRS stability (днів) замість legacy lvl-боксів — інформативніша метрика
  const stability = Math.round(progress?.stability ?? 0);

  return (
    <View style={[styles.card, metal(theme, 'raised', { radius: a.radius })]}>
      <View style={styles.wordRow}>
        {stability > 0 && (
          <View style={[styles.boxBadge, metal(theme, 'inset', { radius: 8 })]}>
            <Text style={styles.boxText}>{t("{n}d").replace("{n}", String(stability))}</Text>
          </View>
        )}
        <Text style={styles.word}>{item.word}</Text>
        <TouchableOpacity style={styles.speakBtn} onPress={() => speak(item.word, item.fromLang || 'en')} hitSlop={6}>
          <Text style={styles.speakIcon}>▶</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.scoreLine}>
        <Text style={{ color: theme.success }}>✓ {c}</Text>  <Text style={{ color: theme.danger }}>✗ {w}</Text>
      </Text>

      <Text style={styles.hint}>{t("Choose the correct translation:")}</Text>
      <View style={[styles.options, a.width >= 700 && { flexDirection: 'row', flexWrap: 'wrap' }]}>
        {item.options.map((opt, i) => {
          const isPicked = picked === opt;
          const isCorrect = opt === item.correct;
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.option,
                metal(theme, 'inset', { radius: a.radius }),
                answered && isCorrect && { ...metal(theme, 'inset', { radius: a.radius }), backgroundColor: theme.success },
                answered && isPicked && !isCorrect && { ...metal(theme, 'inset', { radius: a.radius }), backgroundColor: theme.danger },
                a.width >= 700 && { flexBasis: '48%', flexGrow: 1 },
              ]}
              onPress={() => choose(opt)}
            >
              <Text
                style={[
                  styles.optionText,
                  (answered && (isCorrect || (isPicked && !isCorrect))) && { color: theme.primaryText },
                ]}
              >
                {opt}
              </Text>
              <TouchableOpacity style={styles.speakSmall} onPress={() => speak(opt, item.toLang || 'en')} hitSlop={6}>
                <Text style={styles.speakIconSmall}>🔊</Text>
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
    speakBtn: { ...metal(theme, 'circle', { size: a.icon(34) }), padding: 0 },
    speakIcon: { fontSize: a.fs(18), color: theme.primary },
    speakSmall: { ...metal(theme, 'circle', { size: a.icon(30) }), padding: 0 },
    speakIconSmall: { fontSize: a.fs(14) },
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
    optionText: { fontSize: a.body, color: theme.primaryText, textAlign: 'center', flex: 1 },
  });
}
