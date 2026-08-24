// screens/TrainingScreen.tsx
// Тренировка: карточка слова → выбор перевода (4 варианта) или ввод.
// Формула прохождения одного слова: 5 ВЕРНЫХ ответов ПОДРЯД (streak 0→5).
// Неверный ответ сбрасывает streak до 0, но НЕ продвигает к следующему слову
// и НЕ увеличивает счётчик слов — счётчик растёт только когда слово выучено.
// Очередь взвешена по «редкости» (хуже выучено — чаще). Счётчик верных/неверных
// на каждом слове берётся из trainingStore (correctCount / wrongCount / box).
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, ScrollView } from 'react-native';
import * as Speech from 'expo-speech';
import { useRoute, useNavigation } from '@react-navigation/native';
import BackFab from '../components/BackFab';
import IconButton from '../components/ui/IconButton';
import Screen from '../components/Screen';
import TextField from '../components/ui/TextField';
import { useTheme } from '../theme/ThemeContext';
import { effectiveLang } from '../utils/lang';
import { useSettingsStore } from '../store/settingsStore';
import { useT } from '../i18n';
import { useAdaptive } from '../theme/useAdaptive';
import { useDictionaryStore } from '../store/dictionaryStore';
import { DictionaryEntry } from '../store/dictionaryStore';
import { useTrainingStore } from '../store/trainingStore';
import { useLibraryStore } from '../store/libraryStore';
import QuizCard, { QuizItem } from '../components/QuizCard';
import Icon from '../components/Icon';
import ModalSheet from '../components/ModalSheet';
import SupportButton from '../components/SupportButton';
import SupportAuthorModal from '../components/SupportAuthorModal';
import { useSupportAutoOpen } from '../hooks/useSupportAutoOpen';
import { useSupportStore } from '../store/supportStore';
import { showSupportAd } from '../services/monetization';
import { metal, neuShadowPad } from '../theme/neu';

const TARGET_STREAK = 5;

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[.,!?;:]/g, '');
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// вес по «редкости»: чем меньше box (хуже выучено), тем чаще
export default function TrainingScreen() {
  const theme = useTheme();
  const t = useT();
  const a = useAdaptive();
  const route = useRoute<any>();
  const routeBookId: string | undefined = route.params?.bookId;
  const navigation = useNavigation<any>();
  const entries = useDictionaryStore((s) => s.entries) as DictionaryEntry[];
  const removeEntry = useDictionaryStore((s) => s.removeEntry);
  const books = useLibraryStore((s) => s.books);
  const recordAnswer = useTrainingStore((s) => s.recordAnswer);
  // binary → FSRS grade: wrong=1(again), correct=3(good). Час відповіді type-режим додає окремо.
  const recordBinary = useCallback(
    (word: string, lang: string, correct: boolean) => recordAnswer(word, lang, correct ? 3 : 1),
    [recordAnswer],
  );
  const progress = useTrainingStore((s) => s.progress) as Record<string, any>;

  // уникальные книги, от которых есть слова в словаре
  const bookSources = useMemo(() => {
    const ids = Array.from(new Set(entries.map((e) => e.bookId).filter(Boolean) as string[]));
    return ids.map((id) => ({ id, title: books.find((b) => b.id === id)?.title ?? id }));
  }, [entries, books]);

  const [source, setSource] = useState<'all' | string>(routeBookId ? routeBookId : 'all');

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, padding: a.pad, width: '100%', maxWidth: a.contentMaxW, alignSelf: 'center', paddingTop: a.pad },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8, marginTop: a.insetTop + 10, flexWrap: 'nowrap' },
    counterBadges: { flexDirection: 'row', gap: 6 },
    counter: { fontSize: a.small_fs },
    counterBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    counterBadgeText: { fontFamily: 'bold', fontSize: a.small_fs },
    restart: { fontSize: a.small_fs, fontFamily: 'bold' },
    // Стартовый экран: контент сверху, без «провала» пустоты в центре.
    startScroll: {
      flexGrow: 1,
      padding: a.pad,
      paddingTop: a.insetTop * 2 + a.tabBarH + 24 + Math.round(a.fab()) + a.gap,
      gap: a.gap,
      width: '100%',
      maxWidth: a.isTablet ? 720 : 560,
      alignSelf: 'center',
    },
    heroCard: { ...metal(theme, 'raised', { radius: a.radius + 4, strength: 0.6 }), padding: a.tiny ? 12 : a.isTablet ? 22 : 16, gap: a.tiny ? 8 : 12 },
    heroTop: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
    heroFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
    heroFooterText: { fontSize: a.small_fs },
    heroFooterValue: { fontSize: a.small_fs, fontFamily: 'bold' },
    progressTrack: { height: a.tiny ? 6 : 8, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    sourceCard: { ...metal(theme, 'raised', { radius: a.radius + 4, strength: 0.6 }), padding: a.tiny ? 10 : a.isTablet ? 18 : 14, gap: a.tiny ? 6 : 10 },
    // На планшете/десктопе две CTA в ряд — заполняют ширину, нет пустоты сбоку.
    actions: { gap: a.tiny ? 8 : 10, flexDirection: 'row' },
    btnSub: { fontSize: a.tiny ? a.fs(11) : a.fs(12), color: theme.primaryText, marginTop: 2, textAlign: 'center' },
    finishStats: { fontSize: a.small_fs, marginTop: 2 },
    sourceLabel: { fontSize: a.small_fs, fontFamily: 'bold' },
    sourceTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    sourceTab: {
      paddingVertical: a.tiny ? 6 : 8,
      paddingHorizontal: a.tiny ? 10 : 14,
      borderRadius: 999,
      maxWidth: '100%',
      flexShrink: 1,
    },
    sourceTabText: { fontSize: a.small_fs, fontFamily: 'bold' },
    streakRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: a.gap, flexWrap: 'wrap' },
    streakLabel: { fontSize: a.small_fs },
    dots: { flexDirection: 'row', gap: 6, flex: 1, flexWrap: 'wrap' },
    dot: { width: a.icon(14), height: a.icon(14), borderRadius: a.icon(14) / 2 },
    streakNum: { fontSize: a.body, fontFamily: 'bold', marginRight: a.fab() * 2 },
    accuracy: { fontSize: a.small_fs, textAlign: 'center', marginBottom: a.gap },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: a.pad },
    empty: { textAlign: 'center', padding: 40, fontSize: a.body },
    bigCount: { fontSize: a.fs(a.isTablet ? 60 : 44), fontFamily: 'bold', lineHeight: Math.round(a.fs(a.isTablet ? 60 : 44) * 1.05) },
    countLabel: { fontSize: a.small_fs, lineHeight: Math.round(a.small_fs * 1.25), flexShrink: 1 },
    result: { marginTop: 8, marginBottom: a.gap, fontSize: a.body },
    finishBanner: { ...metal(theme, 'raised', { radius: a.radius + 4, strength: 0.6 }), alignItems: 'center', padding: a.pad, gap: 2, borderWidth: 0 },
    finishTitle: { fontSize: a.title, fontFamily: 'bold' },
    finishSub: { fontSize: a.body, marginTop: 4, marginBottom: 6 },
    btn: { flex: 1, borderRadius: a.radius + 2, paddingVertical: a.tiny ? 12 : 16, paddingHorizontal: a.tiny ? 10 : 16, alignItems: 'center', minHeight: a.tiny ? 56 : 64 },
    btnText: { color: theme.onPrimary, fontFamily: 'bold', fontSize: a.body },
    typeCard: { ...metal(theme, 'raised', { radius: a.radius, strength: 0.6 }), padding: a.pad, marginTop: 8 },
    wordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
    typeWord: { fontSize: a.fs(28), fontFamily: 'bold', color: theme.primaryText, textAlign: 'center', flexShrink: 1 },
    speakBtn: { ...metal(theme, 'circle', { size: a.icon(34) }), alignItems: 'center', justifyContent: 'center', padding: 0 },
    speakIcon: { fontSize: a.fs(18), color: theme.primaryText },
    typeHint: { fontSize: a.fs(14), textAlign: 'center', marginTop: 12, marginBottom: 8 },
    typeInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: a.tiny ? 8 : 12, fontSize: a.body },
    typeCheck: { borderRadius: a.radius, paddingVertical: a.tiny ? 17 : 21, alignItems: 'center', justifyContent: 'center', flex: 1 },
    skipBtn: { width: Math.round(Math.max(36, 44 * a.scale)), height: Math.round(Math.max(36, 44 * a.scale)), borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    typeCorrect: { fontSize: a.small_fs, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
  }), [a, theme]);

  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<'quiz' | 'type' | 'tf' | 'cloze'>('quiz');
  // Напрямок тренування — ОКРЕМО для кожного режиму:
  // forward = слово → переклад, reverse = переклад → слово
  const [directions, setDirections] = useState<Record<string, boolean>>({
    quiz: false,
    type: false,
    tf: false,
    cloze: false,
  });
  // Активний напрямок для поточного режиму (до старту — для quiz)
  const reverse = directions[mode];
  const DAILY_GOAL = 10; // відповідей на день (daily goal)
  const [index, setIndex] = useState(0); // индекс уникального слова в очереди
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [finished, setFinished] = useState(false);
  const [typed, setTyped] = useState('');
  const [typeChecked, setTypeChecked] = useState(false); // показ результата после проверки
  const [typeOk, setTypeOk] = useState(false); // верно/неверно для подсветки
  const [, setStreak] = useState(0); // верные подряд по текущему слову
  const [queue, setQueue] = useState<DictionaryEntry[]>([]); // фиксированная очередь на сессию
  const [supportOpen, setSupportOpen] = useState(false);
  // Support: після виконання daily goal (peak moment) або через 3 хв активного тренування
  useSupportAutoOpen(() => setSupportOpen(true), { surface: 'training', sessionAnswers: stats.correct + stats.wrong });
  const onSupportConfirm = async () => {
    setSupportOpen(false);
    const ok = await showSupportAd();
    if (ok) useSupportStore.getState().markAdWatched();
  };
  const onDonate = () => {
    setSupportOpen(false);
    useSupportStore.getState().setDontShowSupport(true);
  };
  const onSupportDismiss = () => {
    setSupportOpen(false);
    useSupportStore.getState().incrementDismiss();
  };
  const typeInputRef = useRef<any>(null);

  const learnedCount = useMemo(
    () => Object.values(progress).filter((p) => (p?.box ?? 1) >= 5).length,
    [progress],
  );

  // Статистика активності (FSRS): streak днів, відповіді сьогодні, до повторення
  const activityStats = useMemo(() => {
    const now = Date.now();
    const dayMs = 86_400_000;
    const todayStart = new Date().setHours(0, 0, 0, 0);
    let answeredToday = 0;
    let dueNow = 0;
    const activeDays = new Set<number>();
    for (const p of Object.values(progress) as any[]) {
      if (!p?.lastSeenAt) continue;
      if (p.lastSeenAt >= todayStart) answeredToday++;
      activeDays.add(Math.floor(p.lastSeenAt / dayMs));
      if (p.nextReviewAt && p.nextReviewAt <= now) dueNow++;
    }
    // streak: скільки днів підряд (включно з сьогодні або вчора) були відповіді
    let streak = 0;
    let dayCursor = Math.floor(now / dayMs);
    const todayHas = activeDays.has(dayCursor);
    if (!todayHas) dayCursor -= 1; // якщо сьогодні ще не займався — рахуємо від вчорашнього
    while (activeDays.has(dayCursor)) { streak++; dayCursor -= 1; }
    return { answeredToday, dueNow, streak };
  }, [progress]);

  // пул слов согласно источнику (вся библиотека / книга) и исключая выученные (box>=4)
  const pool = useMemo(() => {
    return entries.filter((e) => {
      if (source !== 'all' && e.bookId !== source) return false;
      const p = progress[`${e.word}|${e.lang}`];
      // выученные (box>=4) НЕ исключаем полностью — иначе pool пустой и current=undefined (краш).
      // реже показываем через weight в buildQueue.
      return true;
    });
  }, [entries, source, progress]);


  // перемешивание БЕЗ соседних повторов одного и того же слова
  function shuffleNoAdjacentDup(arr: DictionaryEntry[]): DictionaryEntry[] {
    const a = shuffle(arr);
    for (let i = 1; i < a.length; i++) {
      if (a[i].word === a[i - 1].word) {
        // ищем подходящий не-соседний элемент для обмена
        for (let j = i + 1; j < a.length; j++) {
          if (a[j].word !== a[i].word && (j === 0 || a[j].word !== a[j - 1].word) && (j + 1 >= a.length || a[j + 1].word !== a[i].word)) {
            [a[i], a[j]] = [a[j], a[i]];
            break;
          }
        }
      }
    }
    return a;
  }

  // собираем фиксированную очередь НА СТАРТЕ (не пересобираем при каждом ответе!)
  // дедуп по word|lang — одно слово НЕ дублируется подряд (иначе кажется "не меняется")
  const buildQueue = useCallback((): DictionaryEntry[] => {
    if (pool.length === 0) return [];
    const seen = new Set<string>();
    const unique: DictionaryEntry[] = [];
    pool.forEach((e) => {
      const k = `${e.word}|${e.lang}`;
      if (seen.has(k)) return;
      // пропускаем слова без перевода — иначе correct="" и пустая кнопка засчитывается как верно
      if (!e.translation || !e.translation.trim()) return;
      seen.add(k);
      unique.push(e);
    });
    // взвешивание: новые/с ошибками — чаще (через повторение в отдельном массиве перед shuffle)
    const weighted: DictionaryEntry[] = [];
    unique.forEach((e) => {
      const p = progress[`${e.word}|${e.lang}`];
      const box = p?.box ?? 1;
      const cw = p?.correctStreak ?? 0;
      const weight = cw === 0 ? 3 : box <= 2 ? 2 : 1;
      for (let i = 0; i < weight; i++) weighted.push(e);
    });
    return shuffleNoAdjacentDup(weighted).slice(0, Math.max(10, unique.length));
  }, [pool, progress]);

  // Мови тренування: пріоритет — мови обраної книги (як у читанні).
  // 'all' → цільова мова з глобальних налаштувань читання (targetLang), оригінал auto.
  const settingsTargetLang = useSettingsStore((s) => s.targetLang);
  const sourceBook = useMemo(
    () => (source !== 'all' ? books.find((b) => b.id === source) : undefined),
    [source, books],
  );
  const fromLang = effectiveLang(sourceBook?.language);
  const toLang = sourceBook?.targetLang ?? settingsTargetLang ?? 'uk';
  // Зміна цільової мови прямо в тренуванні (для 'all' джерела)
  const [trainTargetLang, setTrainTargetLang] = useState<string | null>(null);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  // Яка кнопка режиму має розгорнуту панель напрямку
  const effectiveToLang = trainTargetLang ?? toLang;

  const [opts, setOpts] = useState<string[]>([]);
  const current = queue[index];
  // ---- True/False режим: слово + показаний переклад (можливо чужий) → ✓/✗ ----
  const [tfPair, setTfPair] = useState<{ shownTranslation: string; isTrue: boolean } | null>(null);
  const [tfAnswered, setTfAnswered] = useState<null | boolean>(null);
  // час показу слова — для авто-градації FSRS у type-режимі (швидко=Easy, повільно=Hard)
  const typeShownAt = useRef(Date.now());
  // pool меняется при каждом ответе (progress), но перемешивать варианты
  // повторно НЕЛЬЗЯ — иначе правильный ответ «прыгает» после клика.
  // Читаем pool через ref, чтобы эффект не переподписывался на progress.
  const poolRef = useRef(pool);
  poolRef.current = pool;
  useEffect(() => {
    if (!current) { setOpts([]); return; }
    // Reverse-режим: дистрактори — слова (surfaceForm), а не переклади
    const distractorField = reverse ? 'surfaceForm' : 'translation';
    const correctVal = reverse ? (current.surfaceForm || current.word) : current.translation;
    const distractors = shuffle(
      poolRef.current
        .filter((e: DictionaryEntry) => {
          const v = reverse ? (e.surfaceForm || e.word) : e.translation;
          return v && v.trim() && v !== correctVal;
        })
        .slice(0, 3)
        .map((e: DictionaryEntry) => (reverse ? (e.surfaceForm || e.word) : e.translation)),
    );
    setOpts(shuffle([correctVal, ...distractors]));
  }, [index, current?.word, reverse]);

  const quiz: QuizItem | null = useMemo(() => {
    if (queue.length === 0 || index >= queue.length || opts.length === 0) return null;
    const c = queue[index];
    // Reverse-режим: показуємо переклад, шукаємо слово (uk→en)
    if (reverse) {
      return {
        word: c.translation,
        correct: c.surfaceForm || c.word,
        options: opts,
        fromLang: sourceBook ? toLang : 'en',
        toLang: sourceBook ? fromLang : c.lang,
      };
    }
    return {
      word: c.surfaceForm || c.word,
      correct: c.translation,
      options: opts,
      fromLang: sourceBook ? fromLang : c.lang,
      toLang: effectiveToLang,
    };
  }, [queue, index, opts, sourceBook, fromLang, toLang, effectiveToLang, reverse]);

  const onAnswer = useCallback(
    (correct: boolean, opts?: { grade?: 2 | 3 | 4 }) => {
      const current = queue[index];
      if (!current) return;
      try {
        // FSRS-градація: явна (type за часом) або binary-мапінг (quiz/TF)
        const grade = opts?.grade ?? (correct ? 3 : 1);
        recordAnswer(current.word, sourceBook ? fromLang : current.lang, grade);
      } catch (e) {
        console.warn('recordAnswer failed', e);
      }
      setStats((s) => ({ correct: s.correct + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }));
      // смена слова — отдельно, через onNext (вызывается QuizCard через 1с)
    },
    [queue, index, recordAnswer, sourceBook, fromLang],
  );

  const onNext = useCallback(() => {
    const next = index + 1;
    if (next >= queue.length) setFinished(true);
    else setIndex(next);
  }, [queue, index]);

  // "Знаю слово" — видаляє його зі словника (і з черги). Альтернатива багаторазовим підтвердженням.
  const knowAndRemove = useCallback(() => {
    const current = queue[index];
    if (!current) return;
    const entry = entries.find((e) => e.word === current.word && e.lang === current.lang);
    if (entry) {
      try {
        removeEntry(entry.id);
      } catch (e) {
        console.warn('removeEntry failed', e);
      }
    }
    onNext();
  }, [queue, index, entries, removeEntry, onNext]);

  // TF: генерація пари при зміні слова (50% справжній переклад, 50% чужий схожої довжини)
  // Reverse-режим: показуємо переклад, пара = слово (uk→en)
  useEffect(() => {
    if (mode !== 'tf' || !current) { setTfPair(null); setTfAnswered(null); return; }
    const prompt = reverse ? (current.translation) : (current.surfaceForm || current.word);
    const answer = reverse ? (current.surfaceForm || current.word) : current.translation;
    const makeTrue = Math.random() < 0.5;
    if (makeTrue) {
      setTfPair({ shownTranslation: answer, isTrue: true });
    } else {
      const others = poolRef.current.filter(
        (e: DictionaryEntry) => `${e.word}|${e.lang}` !== `${current.word}|${current.lang}`,
      );
      const answerVal = reverse ? (current.surfaceForm || current.word) : current.translation;
      const othersVals = others.map((e: DictionaryEntry) => (reverse ? (e.surfaceForm || e.word) : e.translation)).filter(Boolean);
      const len = answerVal.length;
      const similar = othersVals.filter((v: string) => Math.abs(v.length - len) <= Math.max(6, len * 0.4));
      const pool2 = similar.length > 0 ? similar : othersVals;
      const fake = pool2[Math.floor(Math.random() * pool2.length)];
      setTfPair({ shownTranslation: fake ?? answer, isTrue: false });
    }
    setTfAnswered(null);
  }, [mode, current]);

  const answerTf = useCallback(
    (userSaysTrue: boolean) => {
      if (!tfPair || tfAnswered !== null || !current) return;
      const correct = userSaysTrue === tfPair.isTrue;
      setTfAnswered(userSaysTrue);
      onAnswer(correct);
      setTimeout(() => onNext(), 700);
    },
    [tfPair, tfAnswered, current, onAnswer, onNext],
  );

  // ---- Cloze режим: речення з контексту з пропуском слова → вибір перекладу ----
  const [cloze, setCloze] = useState<{ sentence: string; maskedWord: string; options: string[] } | null>(null);
  const [clozePicked, setClozePicked] = useState<string | null>(null);
  // Map-індекс entries по word|lang — O(1) замість O(n) find на кожне слово
  const entryIndex = useMemo(
    () => new Map(entries.map((e) => [`${e.word}|${e.lang}`, e] as const)),
    [entries],
  );
  useEffect(() => {
    if (mode !== 'cloze' || !current) { setCloze(null); setClozePicked(null); return; }
    // контекст: речення, що містить слово (з DictionaryEntry.context)
    const entry = entryIndex.get(`${current.word}|${current.lang}`);
    const target = (current.surfaceForm || current.word).toLowerCase();
    let sentence = '';
    if (entry?.context) {
      // беремо речення зі словом (перше, що містить surfaceForm або word)
      const cand = entry.context
        .split(/(?<=[.!?…])\s+/)
        .find((s: string) => s.toLowerCase().includes(target));
      sentence = cand || entry.context.slice(0, 220);
    }
    if (!sentence || !sentence.toLowerCase().includes(target)) {
      // FALLBACK: немає контексту → показуємо звичайну картку слово→переклад (замість skip)
      const distractors = shuffle(
        poolRef.current.filter((e: DictionaryEntry) => e.translation && e.translation.trim() && e.translation !== current.translation),
      ).slice(0, 3).map((e: DictionaryEntry) => e.translation);
      setCloze({ sentence: `${current.surfaceForm || current.word} → ______`, maskedWord: current.translation, options: shuffle([current.translation, ...distractors]) });
      setClozePicked(null); return;
    }
    // маскуємо ПЕРШЕ входження слова (reg-insensitive, ціле слово) і запам'ятовуємо його
    const re = new RegExp(`\\b${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*`, 'i');
    const match = sentence.match(re);
    if (!match) { setCloze(null); setClozePicked(null); return; }
    const maskedWord = match[0]; // саме це слово стояло в пропускі (з закінченням)
    const masked = sentence.replace(re, '______');

    if (reverse) {
      // REVERSE: речення англ. з пропуском → варіанти УКРАЇНСЬКІ (переклади).
      // Юзер вибирає переклад пропущеного слова.
      const distractors = shuffle(
        poolRef.current.filter((e: DictionaryEntry) =>
          e.translation && e.translation.trim() && e.translation !== current.translation),
      ).slice(0, 3).map((e: DictionaryEntry) => e.translation);
      setCloze({ sentence: masked, maskedWord: current.translation,
                 options: shuffle([current.translation, ...distractors]) });
      setClozePicked(null); return;
    }

    // FORWARD: речення англ. → варіанти англійські слова тієї ж мови.
    const others = poolRef.current
      .filter((e: DictionaryEntry) => {
        const w = (e.surfaceForm || e.word);
        return w && `${e.word}|${e.lang}` !== `${current.word}|${current.lang}`;
      })
      .map((e: DictionaryEntry) => (e.surfaceForm || e.word));
    const len = maskedWord.length;
    const similar = others.filter((w: string) => Math.abs(w.length - len) <= Math.max(4, len * 0.5));
    const pool2 = similar.length >= 3 ? similar : others;
    const distractors = shuffle(pool2).slice(0, 3);

    setCloze({ sentence: masked, maskedWord, options: shuffle([maskedWord, ...distractors]) });
    setClozePicked(null);
  }, [mode, current, entries, reverse]);
  const answerCloze = useCallback(
    (picked: string) => {
      if (!current || clozePicked !== null) return;
      const correct = picked === (cloze?.maskedWord ?? '');
      setClozePicked(picked);
      onAnswer(correct);
      setTimeout(() => onNext(), 900);
    },
    [clozePicked, current, onAnswer, onNext, cloze],
  );

  // сброс состояния проверки при смене слова
  useEffect(() => {
    setTypeChecked(false);
    setTyped('');
    typeShownAt.current = Date.now(); // для FSRS авто-градації (швидкість відповіді)
    if (mode === 'type') {
      const id = requestAnimationFrame(() => typeInputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [index, mode]);



  const start = (m: 'quiz' | 'type' | 'tf' | 'cloze') => {
    const q = buildQueue();
    if (q.length === 0) {
      // нет слов для тренировки — не стартуем с пустой очередью (иначе current=undefined -> краш)
      setQueue([]);
      setStarted(true);
      setFinished(false);
      return;
    }
    setMode(m);
    setIndex(0);
    setStats({ correct: 0, wrong: 0 });
    setStreak(0);
    setTyped('');
    setFinished(false);
    setQueue(q);
    setStarted(true);
  };

  if (entries.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: 'transparent' }]}>
        <Text style={[styles.empty, { color: theme.secondaryText }]}>{t("No words to train. Save words while reading.")}</Text>
      </View>
    );
  }

  if (!started || finished) {
    const pct = entries.length ? Math.round((learnedCount / entries.length) * 100) : 0;
    return (
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[styles.startScroll, { paddingHorizontal: neuShadowPad(a.radius + 4), paddingBottom: a.tabBarH + a.pad }]}
        showsVerticalScrollIndicator={false}
      >
        <BackFab onPress={() => navigation.goBack()} />
        {/* SupportButton — absolute, той самий рівень що BackFab (правий верхній кут) */}
        <View style={{ position: 'absolute', top: Math.max(28, a.pad * 2.5), right: Math.max(28, a.pad * 2.5), zIndex: 50 }}>
          <SupportButton size={a.fab()} iconSize={Math.round(a.fab() * 0.5)} />
        </View>
        {finished && (
          <View style={[styles.finishBanner, metal(theme, 'raised', { radius: a.radius + 4, strength: 0.6 }), { borderColor: theme.success }]}>
            <Text style={[styles.finishTitle, { color: theme.success }]}>{t("Keep it up! 🎉")}</Text>
            <Text style={[styles.finishSub, { color: theme.primaryText }]}>{t("All words from the book are learned!")}</Text>
            <Text style={[styles.finishStats, { color: theme.secondaryText }]}>
              {t("Correct: {c} · Wrong: {w}").replace(/\{c\}/g, String(stats.correct)).replace(/\{w\}/g, String(stats.wrong))}
            </Text>
          </View>
        )}

        {/* Карточка прогресса: число, шкала и счётчик собраны в один блок */}
        <View style={[styles.heroCard, metal(theme, 'raised', { radius: a.radius + 4, strength: 0.6 })]}>
          <View style={styles.heroTop}>
            <Text style={[styles.bigCount, { color: theme.primary }]}>{entries.length}</Text>
            <Text style={[styles.countLabel, { color: theme.secondaryText }]}>{t("words")}{'\n'}{t("in dictionary")}</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: theme.success }]} />
          </View>
          <View style={styles.heroFooter}>
            <Text style={[styles.heroFooterText, { color: theme.secondaryText }]}>{t("Learned (lvl 5)")}</Text>
            <Text style={[styles.heroFooterValue, { color: theme.success }]}>
              {learnedCount} / {entries.length} · {pct}%
            </Text>
          </View>
          {/* Статистика активності (FSRS): streak / сьогодні / до повторення */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 8 }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={[styles.heroFooterValue, { color: theme.primary }]}>{activityStats.streak}</Text>
              <Text style={[styles.heroFooterText, { color: theme.secondaryText, fontSize: a.fs(11) }]}>{t("day streak")}</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={[styles.heroFooterValue, { color: theme.primary }]}>{activityStats.answeredToday}</Text>
              <Text style={[styles.heroFooterText, { color: theme.secondaryText, fontSize: a.fs(11) }]}>{t("answers today")}</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={[styles.heroFooterValue, { color: activityStats.dueNow > 0 ? theme.danger : theme.primary }]}>{activityStats.dueNow}</Text>
              <Text style={[styles.heroFooterText, { color: theme.secondaryText, fontSize: a.fs(11) }]}>{t("due now")}</Text>
            </View>
          </View>
          {/* Daily goal (10 відповідей/день): прогрес-бар */}
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={[styles.heroFooterText, { color: theme.secondaryText, fontSize: a.fs(11) }]}>{t("Daily goal")}</Text>
              <Text style={[styles.heroFooterValue, { color: activityStats.answeredToday >= DAILY_GOAL ? theme.success : theme.primary, fontSize: a.fs(11) }]}>
                {Math.min(activityStats.answeredToday, DAILY_GOAL)} / {DAILY_GOAL}
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, Math.round((activityStats.answeredToday / DAILY_GOAL) * 100))}%`,
                    backgroundColor: activityStats.answeredToday >= DAILY_GOAL ? theme.success : theme.primary,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Режими тренувань */}
        <View style={{ gap: a.gap }}>
          {([
            { mode: 'quiz' as const, label: finished ? t("Again: multiple choice") : t("Multiple choice"),
              sub: t("Find the translation among 4 cards") },
            { mode: 'type' as const, label: finished ? t("Again: typing") : t("Type the translation"),
              sub: t("Type the translation manually") },
            { mode: 'tf' as const, label: finished ? t("Again: true or false") : t("True or false"),
              sub: t("Is this the right translation?") },
            { mode: 'cloze' as const, label: finished ? t("Again: fill the blank") : t("Fill the blank"),
              sub: t("Pick translation from sentence context") },
          ] as const).map(({ mode: m, label, sub }) => (
            <TouchableOpacity
              key={m}
              style={[styles.btn, metal(theme, 'inset', { radius: a.radius + 2 }), { width: '100%' }]}
              onPress={() => start(m)}
            >
              <Text style={[styles.btnText, { color: theme.secondaryText }]}>{label}</Text>
              <Text style={[styles.btnSub, { color: theme.secondaryText }]}>{sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!routeBookId && (
          <View style={[styles.sourceCard, metal(theme, 'raised', { radius: a.radius + 4, strength: 0.6 })]}>
            <Text style={[styles.sourceLabel, { color: theme.secondaryText }]}>{t("Train")}</Text>
            <View style={styles.sourceTabs}>
              <TouchableOpacity
                style={[
                  styles.sourceTab,
                  metal(theme, source === 'all' ? 'primary' : 'inset', { radius: 999 }),
                ]}
                onPress={() => setSource('all')}
              >
                <Text style={[styles.sourceTabText, { color: source === 'all' ? theme.onPrimary : theme.primaryText }]}>
                  {t("Whole dictionary")}
                </Text>
              </TouchableOpacity>
              {bookSources.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.sourceTab,
                    metal(theme, source === b.id ? 'primary' : 'inset', { radius: 999 }),
                  ]}
                  onPress={() => setSource(b.id)}
                >
                  <Text
                   style={[styles.sourceTabText, { color: source === b.id ? theme.onPrimary : theme.primaryText }]}
                   numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {b.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    );
  }

  const backFabH = Math.round(a.fab());

  // стартовый / финишный экран: BackFab абсолютный, контент в ScrollView — отступ сверху
  // делаем через paddingStart ScrollView (см. startScroll). В активном режиме (ниже) контент
  // идёт сразу под абсолютный BackFab — поэтому container получает paddingTop с учётом его высоты.

  if (!current) {
    // очередь пуста (нет слов для тренировки) — показываем заглушку вместо краша
    return (
      <Screen contentStyle={{ paddingHorizontal: a.pad, paddingTop: a.insetTop, paddingBottom: a.pad }}>
        <View style={[styles.center, { backgroundColor: 'transparent' }]}>
          <Text style={[styles.empty, { color: theme.secondaryText }]}>{t("No words to train. Save words while reading.")}</Text>
        </View>
      </Screen>
    );
  }
  const currentProgress = progress[`${current.word}|${current.lang}`] || null;

  // точки прогресса КОНКРЕТНОГО слова из trainingStore (correctStreak 0..5), а не сессионный счётчик
  const wordStreak = currentProgress?.correctStreak ?? 0;
  const dots = [0, 1, 2, 3, 4].map((i) => (
    <View
      key={i}
      style={[
        styles.dot,
        { backgroundColor: i < wordStreak ? theme.primary : theme.border },
      ]}
    />
  ));

  return (
    <Screen contentStyle={{ paddingHorizontal: 0, paddingTop: a.insetTop, paddingBottom: a.pad }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: a.tabBarH + a.pad, gap: a.gap, paddingHorizontal: Math.max(a.pad, neuShadowPad(a.radius + 4)) }}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.topRow}>
        <IconButton icon="arrow-back" onPress={() => { setStarted(false); setFinished(false); setIndex(0); }} variant="circle" size={a.fab()} hitSlop={8} />
        <View style={styles.counterBadges}>
          <View style={[styles.counterBadge, { backgroundColor: theme.success }]}>
            <Text style={[styles.counterBadgeText, { color: "#FFFFFF" }]}>✓ {stats.correct}</Text>
          </View>
          <View style={[styles.counterBadge, { backgroundColor: theme.danger }]}>
            <Text style={[styles.counterBadgeText, { color: "#FFFFFF" }]}>✗ {stats.wrong}</Text>
          </View>
        </View>
        <SupportButton size={a.fab()} iconSize={Math.round(a.fab() * 0.5)} />
      </View>

      <View style={styles.streakRow}>
        <Text style={[styles.streakLabel, { color: theme.secondaryText }]}>{t("Progress of word")}</Text>
        <View style={styles.dots}>{dots}</View>
        {/* Напрямок: слово→переклад / переклад→слово — тап перемикає */}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4,
                   borderRadius: 999, borderWidth: 1, borderColor: theme.border }}
          onPress={() => setDirections((d) => ({ ...d, [mode]: !d[mode] }))}
          hitSlop={6}
        >
          <Text style={{ color: theme.primary, fontSize: a.fs(13), fontFamily: 'bold' }}>⇄</Text>
          <Text style={{ color: theme.secondaryText, fontSize: a.fs(11) }}>
            {directions[mode] ? t("translation → word") : t("word → translation")}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.counter, { color: theme.secondaryText, marginTop: 6 }]}>{t("Word {i} of {n}").replace(/\{i\}/g, String(index + 1)).replace(/\{n\}/g, String(queue.length))}</Text>

      {mode === 'quiz' && quiz && (
        <QuizCard item={quiz} onAnswer={onAnswer} onNext={onNext} progress={currentProgress} resetKey={`${current.word}`} />
      )}

      {mode === 'type' && current && (
        <View style={[styles.typeCard, metal(theme, 'raised', { radius: a.radius, strength: 0.6 })]}>
          <View style={styles.wordRow}>
            <Text style={styles.typeWord}>{reverse ? current.translation : (current.surfaceForm || current.word)}</Text>
            {!reverse && (
              <TouchableOpacity style={styles.speakBtn} onPress={() => { if (current.word) Speech.speak(current.word, { language: current.lang || 'en', rate: 0.95 }); }} hitSlop={6}>
                <Text style={styles.speakIcon}>▶</Text>
              </TouchableOpacity>
            )}
          </View>
          {typeChecked && (
            <Text style={[styles.typeCorrect, { color: typeOk ? theme.success : theme.danger, fontSize: a.fs(15), marginTop: 6 }]}>
              {typeOk ? t("Correct ✓") : `${t("Correct answer: ")}${reverse ? (current.surfaceForm || current.word) : current.translation}`}
            </Text>
          )}
          {currentProgress && (currentProgress.correctCount > 0 || currentProgress.wrongCount > 0) && (
            <Text style={[styles.typeHint, { color: theme.secondaryText }]}>
              ✓ {currentProgress.correctCount}  ✗ {currentProgress.wrongCount}  ·  {t("{n}d memory").replace("{n}", String(Math.round(currentProgress.stability ?? 0)))}
            </Text>
          )}
          <Text style={[styles.typeHint, { color: theme.secondaryText }]}>{t("Enter the translation:")}</Text>
          <TextField
            ref={typeInputRef}
            radius={10}
            style={[styles.typeInput, { borderColor: theme.border, color: theme.primaryText }]}
            value={typed}
            autoFocus
            editable={!typeChecked}
            returnKeyType="done"
            onChangeText={setTyped}
            placeholder={t("your translation")}
            placeholderTextColor={theme.secondaryText}
            onSubmitEditing={() => {
              if (typeChecked) { onNext(); return; }
              const targetVal = reverse ? (current.surfaceForm || current.word) : current.translation;
                const ok = normalize(typed) === normalize(targetVal);
              setTypeOk(ok);
              setTypeChecked(true);
              const elapsed = Date.now() - typeShownAt.current;
              let grade: 2 | 3 | 4 = 3;
              if (!ok) grade = 2;
              else if (elapsed < 5000) grade = 4;
              else if (elapsed > 12000) grade = 2;
              onAnswer(ok, { grade });
              // без авто-переходу — юзер дивиться правильну відповідь і тапає Check (=Next)
            }}
          />
          <View style={{ flexDirection: 'column', gap: a.gap, marginTop: 12 }}>
            <TouchableOpacity
              style={[styles.typeCheck, metal(theme, 'inset', { radius: a.radius }), { borderWidth: 1, borderColor: theme.border }, !typed.trim() && !typeChecked && { opacity: 0.45 }]}
              disabled={!typed.trim()}
              onPress={() => {
                // Другий тап по Check (після перевірки) = перейти до наступного слова
                if (typeChecked) { onNext(); return; }
                if (!typed.trim()) return;
                const targetVal = reverse ? (current.surfaceForm || current.word) : current.translation;
                const ok = normalize(typed) === normalize(targetVal);
                setTypeOk(ok);
                setTypeChecked(true);
                // FSRS авто-градація за швидкістю відповіді (набір руками = точний сигнал)
                const elapsed = Date.now() - typeShownAt.current;
                let grade: 2 | 3 | 4 = 3; // good
                if (!ok) grade = 2; // hard (помилка в наборі)
                else if (elapsed < 5000) grade = 4; // easy — миттєво і без помилок
                else if (elapsed > 12000) grade = 2; // довго думав
                onAnswer(ok, { grade });
                // НЕ авто-переходимо: юзер читає результат і вирішує —
                // тап по Check (=Next), Skip, або "Знаю — видалити"
              }}
            >
              <Text style={styles.btnText}>{typeChecked ? (typeOk ? t("Correct ✓") : t("Wrong ✗")) : t("Check")}</Text>
            </TouchableOpacity>
            {/* Skip: кругла іконка рестарту */}
            <TouchableOpacity
              style={[styles.skipBtn, metal(theme, 'circle', { size: a.icon(40) }), { alignSelf: 'center' }]}
              onPress={() => { if (!typeChecked) onNext(); }}
              hitSlop={8}
            >
              <Icon name="refresh" size={a.dim(0.026, 16, 22)} color={theme.primaryText} />
            </TouchableOpacity>
            {typeChecked && typeOk && (
              <TouchableOpacity
                style={[styles.typeCheck, metal(theme, 'inset', { radius: a.radius }), { borderWidth: 1, borderColor: theme.danger }]}
                onPress={knowAndRemove}
              >
                <Text style={[styles.btnText, { color: theme.danger }]}>✗ {t("I know it")}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {mode === 'tf' && current && tfPair && (
        <>
        <View style={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={[styles.typeCard, metal(theme, 'raised', { radius: a.radius, strength: 0.6 }), { padding: a.pad }]}>
          <Text style={[styles.typeWord, { fontSize: a.fs(26) }]}>{reverse ? current.translation : (current.surfaceForm || current.word)}</Text>
          <Text style={{ color: theme.secondaryText, fontSize: a.small_fs, textAlign: 'center', marginTop: 4 }}>
            {reverse ? t('Word:') : t('Translation:')}
          </Text>
          <Text style={{ color: theme.primaryText, fontSize: a.fs(20), fontFamily: 'bold', textAlign: 'center', marginTop: 12 }}>
            {tfPair.shownTranslation}
          </Text>
          {tfAnswered !== null && (
            <Text style={[styles.typeCorrect, { color: tfAnswered === tfPair.isTrue ? theme.success : theme.danger, fontSize: a.fs(15), marginTop: 10 }]}>
              {tfAnswered === tfPair.isTrue
                ? t("Correct ✓")
                : `${t("Wrong ✗")} — ${current.translation}`}
            </Text>
          )}
        </View>
        </View>

        {/* Панель відповіді притиснута до низу: True зліва, рестарт по центру, False справа */}
        <View style={{ flexGrow: 1 }} />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: a.gap,
            paddingHorizontal: neuShadowPad(a.radius),
            paddingBottom: a.tabBarH + neuShadowPad(a.radius),
            paddingTop: a.pad,
          }}
        >
            <TouchableOpacity
              style={[styles.typeCheck, metal(theme, 'inset', { radius: a.radius }), { borderWidth: 1, borderColor: theme.success }, tfAnswered !== null && { opacity: 0.5 }]}
              disabled={tfAnswered !== null}
              onPress={() => answerTf(true)}
            >
              <Text style={[styles.btnText, { color: theme.success }]}>✓ {t("True")}</Text>
            </TouchableOpacity>
            {/* Рестарт/далі: кругла іконка по центру */}
            <TouchableOpacity
              style={[styles.skipBtn, metal(theme, 'circle', { size: a.icon(44) })]}
              onPress={() => onNext()}
              hitSlop={8}
            >
              <Icon name="refresh" size={a.dim(0.026, 16, 22)} color={theme.primaryText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeCheck, metal(theme, 'inset', { radius: a.radius }), { borderWidth: 1, borderColor: theme.danger }, tfAnswered !== null && { opacity: 0.5 }]}
              disabled={tfAnswered !== null}
              onPress={() => answerTf(false)}
            >
              <Text style={[styles.btnText, { color: theme.danger }]}>✗ {t("False")}</Text>
            </TouchableOpacity>
        </View>
        </>
      )}

      {mode === 'cloze' && current && cloze && (
        <View style={[styles.typeCard, metal(theme, 'raised', { radius: a.radius, strength: 0.6 }), { padding: a.pad, marginTop: 8 }]}>
          <Text style={{ color: theme.secondaryText, fontSize: a.small_fs, textAlign: 'center', marginBottom: 10 }}>
            {t("Fill the blank")}
          </Text>
          <Text style={{ color: theme.primaryText, fontSize: a.fs(17), lineHeight: a.fs(17) * 1.5, textAlign: 'center' }}>
            {cloze.sentence}
          </Text>
          {clozePicked !== null && (
            <Text style={[styles.typeCorrect, { color: clozePicked === cloze.maskedWord ? theme.success : theme.danger, fontSize: a.fs(15), marginTop: 10, textAlign: 'center' }]}>
              {clozePicked === cloze.maskedWord
                ? t("Correct ✓")
                : `${t("Correct answer: ")}${cloze.maskedWord}`}
            </Text>
          )}
          <View style={{ flexDirection: 'column', gap: a.gap, marginTop: 16 }}>
            {cloze.options.map((opt) => {
              const isPicked = clozePicked === opt;
              // Правильна опція = та, що збігається з maskedWord (у reverse це переклад,
              // у forward — слово з речення). Порівняння з current.translation ламало forward.
              const isRight = opt === cloze.maskedWord;
              const showState = clozePicked !== null;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.typeCheck, metal(theme, 'inset', { radius: a.radius }), { borderWidth: 1, borderColor: showState && isRight ? theme.success : showState && isPicked ? theme.danger : theme.border }]}
                  disabled={clozePicked !== null}
                  onPress={() => answerCloze(opt)}
                >
                  <Text style={[styles.btnText, { color: theme.primaryText }]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
      </ScrollView>
      {/* Модалка вибору цільової мови перекладу */}
      <ModalSheet visible={langPickerOpen} onClose={() => setLangPickerOpen(false)}>
        <View style={[styles.typeCard, metal(theme, 'raised', { radius: a.radius, strength: 0.6 }), { padding: a.pad }]}>
          <Text style={[styles.typeWord, { fontSize: a.h2, color: theme.primaryText }]}>{t('Translate to')}</Text>
          <ScrollView style={{ maxHeight: Math.round(a.height * 0.55) }} contentContainerStyle={{ paddingBottom: 8 }}>
            {['uk', 'en', 'de', 'fr', 'es', 'it', 'pl', 'pt', 'nl', 'cs', 'sk', 'sv', 'da', 'fi', 'no', 'hu', 'ro', 'bg', 'el', 'hr', 'sr', 'sl', 'et', 'lv', 'lt', 'vi', 'th', 'id', 'ms', 'hi', 'he', 'fa', 'ar', 'sw', 'zh', 'ja', 'ko', 'ca', 'eu', 'gl', 'cy', 'af', 'is'].map((code) => {
              const active = effectiveToLang === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[styles.sourceTab, { alignSelf: 'stretch' }, active && { backgroundColor: theme.selected, borderWidth: 1.5, borderColor: theme.success }]}
                  onPress={() => { setTrainTargetLang(code); useSettingsStore.getState().setTargetLang(code); setLangPickerOpen(false); }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Text style={[styles.sourceTabText, { color: active ? theme.primaryText : theme.secondaryText }]}>
                      {code.toUpperCase()}
                    </Text>
                    {active && <Text style={{ color: theme.success, fontFamily: 'bold' }}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </ModalSheet>
      <SupportAuthorModal
        visible={supportOpen}
        onSupport={onSupportConfirm}
        onDonate={onDonate}
        onDismiss={onSupportDismiss}
      />
    </Screen>
  );
}

