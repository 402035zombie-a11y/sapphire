// screens/TrainingScreen.tsx
// Тренировка: интервальное повторение сохранённых слов в формате викторины (4 варианта).
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { COLORS, SIZES, FONTS } from '../theme/constants';
import { useDictionaryStore } from '../store/dictionaryStore';
import { DictionaryEntry } from '../store/dictionaryStore';
import { useTrainingStore } from '../store/trainingStore';
import QuizCard, { QuizItem } from '../components/QuizCard';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TrainingScreen() {
  const entries = useDictionaryStore((s) => s.entries) as DictionaryEntry[];
  const recordAnswer = useTrainingStore((s) => s.recordAnswer) as (word: string, lang: string, correct: boolean) => void;
  const dueWords = useTrainingStore((s) => s.dueWords) as (entries: DictionaryEntry[], now?: number) => any[];

  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const [finished, setFinished] = useState(false);

  // слова к повторению (истёк интервал) либо все, если ещё нет прогресса
  const queue = useMemo(() => {
    const due = dueWords(entries);
    if (due.length > 0) {
      return entries.filter((e: DictionaryEntry) => due.some((d: DictionaryEntry) => d.word === e.word && d.lang === e.lang));
    }
    return entries; // первый заход — тренируем всё
  }, [entries, dueWords]);

  const quiz: QuizItem | null = useMemo(() => {
    if (queue.length === 0 || index >= queue.length) return null;
    const current = queue[index];
    const others = shuffle(entries.filter((e: DictionaryEntry) => e.translation !== current.translation)).slice(0, 3);
    const distractors = others.map((e: DictionaryEntry) => e.translation);
    const options = shuffle([current.translation, ...distractors]);
    return { word: current.surfaceForm || current.word, correct: current.translation, options };
  }, [queue, index, entries]);

  const onAnswer = useCallback(
    (correct: boolean) => {
      const current = queue[index];
      recordAnswer(current.word, current.lang, correct);
      setStats((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
      if (index + 1 >= queue.length) {
        setFinished(true);
      } else {
        setIndex((i) => i + 1);
      }
    },
    [queue, index, recordAnswer],
  );

  const restart = () => {
    setIndex(0);
    setStats({ correct: 0, total: 0 });
    setFinished(false);
  };

  if (entries.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Нет слов для тренировки. Сохрани слова из чтения.</Text>
      </View>
    );
  }

  if (finished) {
    return (
      <View style={styles.center}>
        <Text style={styles.resultTitle}>Тренировка завершена!</Text>
        <Text style={styles.result}>
          Правильно: {stats.correct} из {stats.total}
        </Text>
        <TouchableOpacity style={styles.btn} onPress={restart}>
          <Text style={styles.btnText}>Ещё раз</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.counter}>
        Слово {index + 1} из {queue.length}
      </Text>
      {quiz && <QuizCard item={quiz} onAnswer={onAnswer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SIZES.padding },
  counter: { color: COLORS.secondaryText, marginBottom: SIZES.gap, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, padding: SIZES.padding },
  empty: { color: COLORS.secondaryText, textAlign: 'center', padding: 40 },
  resultTitle: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.primaryText },
  result: { color: COLORS.secondaryText, marginTop: 8, marginBottom: SIZES.gap },
  btn: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 12, paddingHorizontal: 24 },
  btnText: { color: '#fff', fontFamily: FONTS.bold },
});
