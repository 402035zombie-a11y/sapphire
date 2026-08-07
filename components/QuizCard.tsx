// components/QuizCard.tsx
// Карточка тренировки: слово + 4 варианта перевода (викторина).
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SIZES, FONTS } from '../theme/constants';

export interface QuizItem {
  word: string;
  correct: string;
  options: string[]; // 4 варианта, включая correct
}

interface Props {
  item: QuizItem;
  onAnswer: (correct: boolean) => void;
}

export default function QuizCard({ item, onAnswer }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const choose = (opt: string) => {
    if (answered) return;
    setPicked(opt);
    setAnswered(true);
    const correct = opt === item.correct;
    // небольшая задержка, чтобы пользователь увидел результат
    setTimeout(() => onAnswer(correct), 600);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.word}>{item.word}</Text>
      <Text style={styles.hint}>Выберите правильный перевод:</Text>
      <View style={styles.options}>
        {item.options.map((opt, i) => {
          const isPicked = picked === opt;
          const isCorrect = opt === item.correct;
          let bg = COLORS.surface;
          if (answered && isCorrect) bg = '#DCFCE7';
          else if (answered && isPicked && !isCorrect) bg = '#FEE2E2';
          return (
            <TouchableOpacity
              key={i}
              style={[styles.option, { backgroundColor: bg }]}
              onPress={() => choose(opt)}
            >
              <Text style={styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.background, padding: SIZES.padding },
  word: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.primaryText, textAlign: 'center' },
  hint: { color: COLORS.secondaryText, textAlign: 'center', marginTop: 8, marginBottom: SIZES.gap },
  options: { gap: 10 },
  option: {
    borderRadius: SIZES.radius,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionText: { fontSize: 16, color: COLORS.primaryText, textAlign: 'center' },
});
