// screens/ReaderScreen.tsx
// Чтение: оригинал + per-paragraph перевод (раскрывается кнопкой «A»).
// - ленивый перевод после остановки скролла (600мс)
// - 2 колонки на широких экранах
// - хедер: назад/языковой селектор/бургер-меню
// - ▶ озвучка абзаца (Web Speech API на web)
import ModalSheet from '../components/ModalSheet';
import Screen from '../components/Screen';
import TextField from '../components/ui/TextField';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../components/Icon';
import LanguageDropdown from '../components/LanguageDropdown';
import { useTheme } from '../theme/ThemeContext';
import { useT } from '../i18n';
import { useAdaptive } from '../theme/useAdaptive';
import { metal } from '../theme/neu';
import { SIZES, FONTS } from '../theme/constants';
import { useLibraryStore } from '../store/libraryStore';
import { BookParagraph } from '../store/libraryStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSupportStore } from '../store/supportStore';
import { splitIntoSegments } from '../utils/sentenceSplitter';
import { translateCached } from '../services/translationService';
import { saveSentenceTranslations, getSentenceTranslations, clearSentenceTranslations } from '../services/sentenceTranslationsDb';
import { stripHtmlToText } from '../services/bookText';
import { showSupportAd } from '../services/monetization';
import { openDonatePage } from '../services/donate';
import { translationErrorMessage } from '../services/translationService';
import SupportAuthorModal from '../components/SupportAuthorModal';
import TranslationLimitsModal from '../components/TranslationLimitsModal';
import { useSupportAutoOpen } from '../hooks/useSupportAutoOpen';
import SentenceRow from '../components/SentenceRow';
import WordBottomSheet from '../components/WordBottomSheet';
import { Clipboard } from 'react-native';
import WordActionSheet from '../components/WordActionSheet';
import { useDictionaryStore } from '../store/dictionaryStore';
import { normalizeWord } from '../utils/wordTokenizer';
import { effectiveLang } from '../utils/lang';
import Marquee from '../components/Marquee';
import IconButton from '../components/ui/IconButton';
import AppSettingsModal from '../components/AppSettingsModal';
import FontSettingsSheet from '../components/FontSettingsSheet';
import { getBookChapters, ensureBookChapters } from '../services/bookImport';
import { translateBatch as translateBatchV2 } from '../services/translationServiceV2';
import { buildChunks, nextChunkIndices, ChunkOptions } from '../services/readerChunker';
import * as Speech from 'expo-speech';
import { onTtsIndex, onTtsState } from '../services/bookTts';

interface RouteParams {
  bookId: string;
  mode?: 'read' | 'dual';
}

const BATCH = 8;

export default function ReaderScreen({ route }: { route: any }) {
  const { bookId } = route.params as RouteParams;
  const mode: 'read' | 'dual' | 'speed' = ((route.params as RouteParams)?.mode as any) ?? 'read';
  const theme = useTheme();
  const t = useT();
  const navigation = useNavigation<any>();
  const a = useAdaptive();
  const styles = React.useMemo(() => makeStyles(a, theme), [a, theme]);

  const book = useLibraryStore((s) => s.books.find((b) => b.id === bookId));
  const setProgress = useLibraryStore((s) => s.setProgress);
  const toggleBookmark = useLibraryStore((s) => s.toggleBookmark);
  const settingsTarget = useSettingsStore((s) => s.targetLang);
  const reader = useSettingsStore((s) => s.reader);
  const addEntry = useDictionaryStore((s) => s.addEntry);
  const hasWord = useDictionaryStore((s) => s.hasWord);
  const [targetLang, setTargetLang] = useState(book?.targetLang ?? settingsTarget ?? 'en');

  /**
   * E4: parse-once — читає глави з books.db (getBookChapters) замість libraryStore.paragraphs.
   * Конвертує contentHtml глави → BookParagraph[] (strip tags + split). Fallback на chapters якщо БД порожня.
   * Працює і веб, і моб (expo-sqlite універсальний).
   */
  // Залежність [bookId], а не [book]: book змінюється при кожному updateSentenceTranslations
  // (нова reference) → memo перераховувався і читав БД заново на кожен переклад (PERF-4).
  // M1 self-heal: якщо в БД немає глав (книги імпортовані до фіксу txt→chapters),
  // реімпортуємо з book.path у фоні; dbVersion тригає перечитання memo.
  const [dbVersion, setDbVersion] = React.useState(0);
  React.useEffect(() => {
    if (!bookId) return;
    if (getBookChapters(bookId).length === 0 && !healingRef.current.has(bookId)) {
      healingRef.current.add(bookId);
      ensureBookChapters(bookId).then((chs) => { if (chs.length > 0) setDbVersion((v) => v + 1); });
    }
  }, [bookId]);
  const healingRef = React.useRef<Set<string>>(new Set());

  const chapters = React.useMemo<BookParagraph[]>(() => {
    if (!bookId) return [];
    const dbChapters = getBookChapters(bookId);
    if (dbChapters.length === 0) return useLibraryStore.getState().books.find((b) => b.id === bookId)?.paragraphs ?? [];
    const out: BookParagraph[] = [];
    for (const ch of dbChapters) {
      // ВЕСЬ текст глави → чистий → splitIntoSegments (ріже на речення, не на <p>).
      // Було: різка по <p> → кожен <p> окремим original, потім hope що sentences-memo доріже.
      // Alice (довгі <p> з кількома реченнями) лишалась цілою. Фікс: ріжемо тут одразу.
      const plain = stripHtmlToText(ch.contentHtml);
      const segs = splitIntoSegments(plain);
      let si = 0;
      for (const s of segs) {
        if (s) out.push({ index: ch.idx * 1000 + si, original: s, translation: '' });
        si++;
      }
    }
    return out;
  }, [bookId, dbVersion]);

  // Структура речень (БЕЗ перекладу). Переклад дістаємо в renderItem з book.sentenceTranslations
  // за ключем item.index. НЕ залежимо від sentenceTranslations → не перераховуємо весь масив
  // на кожен переклад (PERF-5) і не ламаємо memo-рядки.
  const sentences = React.useMemo(() => {
    const out: { original: string; paragraphIndex: number; sentenceIndex: number; index: number }[] = [];
    for (const p of chapters) {
      const segs = splitIntoSegments(p.original);
      segs.forEach((s, si) => {
        out.push({ original: s, paragraphIndex: p.index, sentenceIndex: si, index: p.index * 1000 + si });
      });
    }
    return out;
  }, [chapters]);

  // paragraphIndex -> sentence index (для scrollToIndex після переходу на речення)
  const paraToFirstSentence = React.useMemo(() => {
    const map: Record<number, number> = {};
    let sentenceIdx = 0;
    for (const p of chapters) {
      map[p.index] = sentenceIdx;
      sentenceIdx += splitIntoSegments(p.original).length;
    }
    return map;
  }, [chapters]);

  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  // ---- R3: вертикальне чанкування + префетч перекладу ----
  // Оцінка символів/рядок залежить від ширини контенту та шрифту.
  const fs0 = reader.fontSize ?? 18;
  const contentWidth = Math.max(120, Math.min(width, a.readerMaxW ?? width) - 24);
  const charsPerLine = Math.max(10, Math.floor(contentWidth / Math.max(6, fs0 * 0.55)));
  // Опції чанкера стабільні доки не зміниться шрифт/в'юпорт/режим.
  // R5/T5: lineHeight винесено з chunkerOpts — buildChunks більше НЕ перераховує всю книгу
  // при зміні міжрядкового інтервалу (було джерелом фрізу 5-10с). lineHeight застосовується
  // тільки як візуальний стиль <Text> (ReaderScreen L156/521); chunker рахує maxLines за
  // базовим 1.5 — чанки = одиниці префетчу, не екрани, тому неточність не ламає рендеринг.
  const chunkerOpts: ChunkOptions = React.useMemo(
    () => ({
      viewportHeight: Math.max(120, height - 140),
      fontSize: fs0,
      lineHeight: 1.5, // базовий, не залежить від reader.lineHeight (T5 fix)
      charsPerLine,
      showTranslation: mode === 'dual',
      translateExpansion: 1.3,
      maxChunkLines: 80,
    }),
    [height, width, a.readerMaxW, fs0, mode],
  );
  // Чанки = одиниці планування префетчу перекладу. Перебудовуємось тільки при зміні
  // структури книги (bookId/довжина) або опцій — НЕ на кожен переклад (оригінали
  // не змінюються, тому межі чанків стабільні → уникаємо повторної арифметики).
  const chunks = React.useMemo(
    () => buildChunks(chapters, chunkerOpts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bookId, chapters.length, chunkerOpts],
  );

  const [loadingSet, setLoadingSet] = useState<Set<number>>(new Set());
  const [langOpen, setLangOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const scrollRef = useRef<any>(null);
  const setBookTargetLang = useLibraryStore((s) => s.setBookTargetLang);
  const [selected, setSelected] = useState<{ word: string; sentence: string } | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [action, setAction] = useState<{ word: string; sentence: string } | null>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [limitsOpen, setLimitsOpen] = useState(false);

  const addToDictionary = useCallback(
    (word: string, sentence: string) => {
      if (!book) return;
      const norm = normalizeWord(word);
      const lang = effectiveLang(book.language);
      if (hasWord(norm)) return;
      addEntry({ word: norm, surfaceForm: word, translation: '', context: sentence, lang, bookId: book.id });
    },
    [book, hasWord, addEntry],
  );

  const onWordPress = useCallback(
    (word: string, sentence: string) => {
      if (mode === 'read') {
        setAction({ word, sentence });
        return;
      }
      setSelected({ word, sentence });
    },
    [mode],
  );

  // Нативні TTS-події → React-стан
  useEffect(() => {
    onTtsIndex((i) => setCurrentIndex(i));
    onTtsState((s) => {
      if (s === 'playing') { setIsSpeaking(true); setPaused(false); }
      else if (s === 'paused') { setIsSpeaking(false); setPaused(true); }
      else if (s === 'stopped' || s === 'done') { setIsSpeaking(false); setPaused(false); }
    });
  }, []);

  // Стабільний колбек висоти рядка: інлайн-стрілка тут ламала memo(SentenceRow)
  // → кожен переклад/скрол перерендерював усі видимі рядки (головне джерело лагів).
  const onRowLayoutCb = useCallback((pIdx: number, h: number) => {
    const prev = rowHeights.current.get(pIdx);
    if (prev !== h) rowHeights.current.set(pIdx, h);
  }, []);

  const viewableRef = useRef<Set<number>>(new Set());
  // Під час зміни margin/pageMargins FlatList повністю релайаутиться → onViewableItemsChanged
  // стріляє і запускає translateBatch-шторм поверх релайауту (каскад = багатосекундний лаг).
  // Короткий cooldown після зміни налаштувань це прибирає.
  const settingsChangedAt = useRef(0);
  useEffect(() => {
    settingsChangedAt.current = Date.now();
  }, [reader.margin, reader.pageMarginPx]);
  const visibleRef = useRef<{ first: number; last: number }>({ first: 0, last: 20 });
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookRef = useRef(book);
  const rowHeights = useRef<Map<number, number>>(new Map());
  bookRef.current = book;

  // Refs на актуальні масиви, щоб translateBatch/prefetchAhead не перестворювались
  // і не мали stale-даних (Fix: після 89df93b chapters/sentences — sentence-level з глоб. індексом,
  // а механізм перекладу раніше брав b.paragraphs → ключі не збігалися → переклад не показувався).
  const sentencesRef = useRef(sentences);
  sentencesRef.current = sentences;
  const chaptersRef = useRef(chapters);
  chaptersRef.current = chapters;

  // R3: відстеження префетчу перекладу по чанках (щоб не перекладати двічі).
  const prefetchedChunks = useRef<Set<number>>(new Set());
  const prefetchInFlight = useRef<Set<number>>(new Set());

  // Переклади речень тепер у books.db (SQLite), НЕ в libraryStore JSON.
  // Локальний кеш на сесію → renderItem читає з пам'яті, запис іде точково в БД.
  const translationsRef = useRef<Record<string, string>>({});
  React.useEffect(() => {
    // при зміні книги: підтягнути вже перекладені речення одним запитом
    translationsRef.current = getSentenceTranslations(
      bookId,
      sentences.map((s) => String(s.index)),
    );
    setTranslationsVersion((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, sentences.length]);
  const [translationsVersion, setTranslationsVersion] = useState(0);

  const persistTranslations = useCallback(
    (entries: { key: string; translation: string }[]) => {
      for (const e of entries) translationsRef.current[e.key] = e.translation;
      saveSentenceTranslations(bookId, entries);
      setTranslationsVersion((v) => v + 1); // тригер ререндеру рядків з новим перекладом
    },
    [bookId],
  );

  const translateBatch = useCallback(
    async (first: number, last: number) => {
      const b = bookRef.current;
      if (!b) return;
      const from = b.language === 'auto' ? 'auto' : b.language;
      const st = translationsRef.current;
      const sents = sentencesRef.current;
      const indices: { key: string; idx: number; text: string }[] = [];
      for (let i = first; i <= last && i < sents.length; i++) {
        const s = sents[i];
        if (!s) continue;
        const key = String(s.index);
        if (!st[key]) indices.push({ key, idx: s.index, text: s.original });
      }
      if (indices.length === 0) return;

      setLoadingSet((prev) => new Set([...prev, ...indices.map((x) => x.idx)]));
      try {
        const results = await Promise.all(
          indices.map(async (it) => {
            try {
              const res = await translateCached(it.text, from, targetLang);
              return { key: it.key, translation: res.text } as { key: string; translation: string };
            } catch (e) {
              // Rate-limit/timeout/empty → показуємо стан у рядку, а не мовчки.
              const kind = (e as any)?.kind;
              if ((e as any)?.providers || kind === 'rate-limit') {
                // Усі провайдери вичерпані → модалка з розкладом поновлення.
                setLimitsOpen(true);
              } else if (kind === 'forbidden' || kind === 'timeout') {
                setTranslateError(translationErrorMessage(e));
              }
              return null;
            }
          }),
        );
        const ok = results.filter((r): r is { key: string; translation: string } => r !== null);
        if (ok.length) persistTranslations(ok);
      } catch {
        // ігноруємо — переклад відновиться при наступному показі
      } finally {
        setLoadingSet((prev) => {
          const next = new Set(prev);
          indices.forEach((x) => next.delete(x.idx));
          return next;
        });
      }
    },
    [targetLang, persistTranslations],
  );
  // Стабильный коллбек для SentenceRow.onTranslate(index) — інакше renderItem створює нову
  // функцію на кожен рендер і ламає React.memo(SentenceRow), викликаючи перерендер всіх рядків.
  // index = item.index (унікальний id речення). Знаходимо його позицію у sentences і перекладаємо лише його.
  const translateCb = useCallback((index: number) => {
    const pos = sentencesRef.current.findIndex((s) => s.index === index);
    if (pos >= 0) translateBatch(pos, pos);
  }, [translateBatch]);

  /**
   * R3: префетч перекладу для наступних 5 чанків уперед відносно поточного абзацу.
   * - чанки беруться з `chunks` (розраховані під в'юпорт);
   * - переклад через translationServiceV2.translateBatch (пакетно, паралельно);
   * - вже перекладені абзаци (book.paragraphs[i].translation) пропускаємо;
   * - кожен чанк запускається в префетч максимум один раз (prefetchedChunks),
   *   а паралельні запуски одного чанка блокуються prefetchInFlight.
   * Результати зберігаємо через updateParagraphsTranslations (той самий шлях, що й E4).
   */
  const prefetchAhead = useCallback(
    (currentParagraphIndex: number) => {
      const b = bookRef.current;
      if (!b || mode === 'read') return;
      if (chunks.length === 0) return;
      const from = b.language === 'auto' ? 'auto' : b.language;
      const nextIdx = nextChunkIndices(chunks, currentParagraphIndex, 5);
      for (const ci of nextIdx) {
        if (prefetchedChunks.current.has(ci) || prefetchInFlight.current.has(ci)) continue;
        const chunk = chunks[ci];
        if (!chunk) continue;
        // зібрати речення чанка без перекладу
        const st = translationsRef.current;
        const items: { id: string; text: string }[] = [];
        for (const sIdx of chunk.paragraphIndices) {
          const p = chaptersRef.current.find((c) => c.index === sIdx);
          if (!p) continue;
          const segs = splitIntoSegments(p.original);
          segs.forEach((s, si) => {
            const key = `${p.index * 1000 + si}`;
            if (!st[key]) items.push({ id: key, text: s });
          });
        }
        if (items.length === 0) {
          prefetchedChunks.current.add(ci);
          continue;
        }
        prefetchInFlight.current.add(ci);
        translateBatchV2(items, from, targetLang)
          .then((map) => {
            const entries: { key: string; translation: string }[] = [];
            map.forEach((res, id) => {
              if (res && res.text) entries.push({ key: id as string, translation: res.text });
            });
            if (entries.length) persistTranslations(entries);
          })
          .catch(() => {
            /* ігноруємо — переклад відновиться при наступному показі/скролі */
          })
          .finally(() => {
            prefetchedChunks.current.add(ci);
            prefetchInFlight.current.delete(ci);
          });
      }
    },
    [chunks, mode, targetLang, persistTranslations],
  );


  const onViewableItemsChanged = useCallback(
    ({ viewableItems, changed }: any) => {
      const set = new Set<number>();
      let minIdx = Infinity;
      for (const vi of viewableItems) {
        const idx = vi.index;
        if (typeof idx === 'number') {
          set.add(idx);
          if (idx < minIdx) minIdx = idx;
        }
      }
      viewableRef.current = set;
      // cooldown після зміни margin/pageMargins: не перекладати під час релайауту
      if (Date.now() - settingsChangedAt.current < 800) return;
      // абзац в окне → переводим СРАЗУ (без задержки), якщо ще не всі речення перекладені
      set.forEach((idx) => {
        const s = sentencesRef.current[idx];
        if (!s) return;
        const st = translationsRef.current;
        if (!st[String(s.index)]) translateBatch(idx, idx);
      });

      // R3: префетч перекладу для наступних 5 чанків уперед
      if (minIdx !== Infinity) prefetchAhead(minIdx);
    },
    [translateBatch, prefetchAhead],
  );

  const onScrollBeginDrag = useCallback(() => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
  }, []);

  const onMomentumScrollEnd = useCallback(
    (_e: any) => {
      // при скролле переводим всё видимое сразу (без задержки)
      const visible = viewableRef.current;
      const range: number[] = [];
      if (visible.size === 0) {
        for (let i = visibleRef.current.first; i <= visibleRef.current.last; i++) range.push(i);
      } else {
        visible.forEach((idx) => range.push(idx));
      }
      for (const idx of range) {
        const s = sentencesRef.current[idx];
        if (!s) continue;
        const st = translationsRef.current;
        if (!st[String(s.index)]) translateBatch(idx, idx);
      }
      const total = sentencesRef.current.length || 1;
      const first = visible.size ? Math.min(...visible) : visibleRef.current.first;
      const atEnd = first >= total - 2;
      const pct = atEnd ? 1 : Math.min(1, Math.max(0, first / total));
      setProgress(bookId, pct, Math.max(0, first));
      // R3: префетч перекладу для наступних 5 чанків уперед
      prefetchAhead(first);
    },
    [translateBatch, bookId, setProgress, prefetchAhead],
  );

  // Окно «Поддержать автора» — після 90с занурення в читання (Reciprocity: юзер
  // вже отримав цінність). Peak-момент (завершена глава) пришвидшує показ.
  const dontShowSupport = useSupportStore((s) => s.dontShowSupport);
  useSupportAutoOpen(() => setSupportOpen(true), { surface: 'reader' });

  const onSupportConfirm = async () => {
    setSupportOpen(false);
    const ok = await showSupportAd();
    if (ok) useSupportStore.getState().markAdWatched();
  };

  // Закриття без підтримки → лічильник для зростаючого бекофу показів
  const onSupportDismiss = () => {
    setSupportOpen(false);
    useSupportStore.getState().incrementDismiss();
  };

  // Донат/підтримка: відкриваємо ЗОВНІШНЮ платіжну сторінку (без Play Billing).
  const onDonate = () => {
    setSupportOpen(false);
    openDonatePage();
  };

  useEffect(() => {
    // В режиме 'read' перевод не грузим (пользователь хочет читать оригинал).
    if (mode === 'read') return;
    // Перевод срабатывает по скролл-стопу (onMomentumScrollEnd) и при удержании абзаца в окне >2с.
    const sents = sentencesRef.current ?? [];
    for (let i = 0; i <= BATCH && i < sents.length; i++) {
      const s = sents[i];
      if (!s) continue;
      const st = translationsRef.current;
      if (!st[String(s.index)]) translateBatch(i, i);
    }
    // R3: префетч перекладу для наступних 5 чанків уперед від стартової позиції
    const start = bookRef.current?.lastPosition ?? 0;
    prefetchAhead(start);
    return () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, mode, targetLang, prefetchAhead]);

  // R3: при зміні книги скидаємо відстеження префетчу (старі індекси чанків невалідні).
  useEffect(() => {
    prefetchedChunks.current = new Set();
    prefetchInFlight.current = new Set();
  }, [bookId]);

  // прыжок к разделу/закладке из оглавления или списка закладок
  useEffect(() => {
    const jumpTo = (route.params as any)?.jumpTo;
    if (jumpTo == null || !scrollRef.current) return;
    const idx = Math.max(0, Math.min(jumpTo, sentencesRef.current.length || 1));
    const sentenceIdx = paraToFirstSentence[idx] ?? 0;
    const t = setTimeout(() => {
      scrollRef.current?.scrollToOffset({ offset: sentenceIdx * 120, animated: true });
    }, 300);
    return () => clearTimeout(t);
  }, [route.params]);

  // старт з останньої позиції (book.lastPosition) — замість прибраного initialScrollIndex
  useEffect(() => {
    const b = bookRef.current;
    const pos = b?.lastPosition ?? 0;
    if (pos <= 0 || !scrollRef.current) return;
    const sentenceIdx = paraToFirstSentence[pos] ?? 0;
    const t = setTimeout(() => {
      scrollRef.current?.scrollToOffset({ offset: sentenceIdx * 120, animated: false });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  const speak = useCallback(
    (text: string) => {
      if (isWeb && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = book?.language && book.language !== 'auto' ? book.language : 'en';
        u.onend = () => setIsSpeaking(false);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
        setIsSpeaking(true);
      } else {
        // Нативне озвучування (Android/iOS) через expo-speech.
        Speech.stop();
        Speech.speak(text, {
          language: book?.language && book.language !== 'auto' ? book.language : 'en',
          rate: 0.95,
          onDone: () => setIsSpeaking(false),
        });
        setIsSpeaking(true);
      }
    },
    [isWeb, book],
  );

  const langForSheet = book?.language && book.language !== 'auto' ? book.language : 'en';

  if (!book) {
    return (
      <View style={[styles.center, { backgroundColor: theme.readerBg }]}>
        <Text style={{ color: theme.readerText }}>{t("Book not found.")}</Text>
      </View>
    );
  }



  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <SentenceRow
        index={item.index}
        paragraphIndex={item.paragraphIndex}
        original={item.original}
        translation={translationsRef.current[item.index] ?? ''}
        extraKey={translationsVersion}
        loading={loadingSet.has(item.index)}
        showTranslation={mode === 'dual'}
        fontSize={reader.fontSize}
        lineHeight={reader.lineHeight}
        fontFamily={reader.fontFamily}
        fontWeight={reader.fontWeight}
        textAlign={reader.textAlign}
        letterSpacing={reader.letterSpacing}
        paragraphSpacing={reader.paragraphSpacing}
        pageMarginPx={reader.pageMarginPx ?? 12}
        bookmarked={book.bookmarks?.includes(item.paragraphIndex) ?? false}
        onSpeak={speak}
        onTranslate={translateCb}
        showSpeak={reader.showSpeakButton ?? true}
        showTranslate={reader.showTranslateButton ?? true}
        onWordPress={onWordPress}
        onRowLayout={onRowLayoutCb}
        forceHideTranslation={mode === 'read'}
        mode={mode}
        query={query}
      />
    ),
    [mode, reader, loadingSet, speak, translateCb, onWordPress, rowHeights, translationsVersion],
  );

  const list = (
    <FlatList
      ref={scrollRef}
      style={{ flex: 1 }}
      data={sentences}
      keyExtractor={(p) => `${p.paragraphIndex}-${p.sentenceIndex}`}
      numColumns={1}
      contentContainerStyle={[styles.list, { backgroundColor: theme.readerBg, paddingHorizontal: reader.margin, overflow: 'visible' }]}
      onScrollBeginDrag={onScrollBeginDrag}
      onMomentumScrollEnd={onMomentumScrollEnd}
      initialNumToRender={BATCH}
      windowSize={3}
      maxToRenderPerBatch={8}
      updateCellsBatchingPeriod={100}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{ itemVisiblePercentThreshold: 50, minimumViewTime: 50 }}
      ListFooterComponent={
        loadingSet.size > 0 ? <ActivityIndicator style={styles.footer} color={theme.secondaryText} /> : null
      }
      renderItem={renderItem}
    />
  );

  const header = (
    <View style={[styles.header, metal(theme, 'raised', { radius: a.radius, strength: 0.6 })]}>
      <View style={[styles.headerRow, { paddingLeft: a.pad, paddingRight: a.pad, paddingTop: a.small ? 4 : 6, paddingBottom: a.small ? 4 : 6, maxHeight: a.small ? 56 : 68 }]}>
        <IconButton icon="arrow-back" onPress={() => navigation.goBack()} variant="circle" size={a.fab()} hitSlop={8} style={{ flexShrink: 0 }} />
        <View style={styles.titleGroup}>
          <Marquee text={book.title} textStyle={[styles.title, { color: theme.primaryText }]} />
        </View>
        <View style={[styles.headerRight, { position: 'relative' }]}>
          {mode === 'dual' && (
            <IconButton icon="language" onPress={() => setLangOpen((v) => !v)} variant="circle" size={a.fab()} hitSlop={8} />
          )}
          <IconButton icon="settings" onPress={() => setFontOpen(true)} variant="circle" size={a.fab()} hitSlop={8} />
          <IconButton icon="heart" onPress={() => setSupportOpen(true)} variant="circle" size={a.fab()} hitSlop={8} />
          {langOpen && (
            <LanguageDropdown
              value={targetLang}
              excludeRu
              onSelect={(code) => {
                setTargetLang(code);
                if (book?.id) setBookTargetLang(book.id, code);
                // сбросить перевод: чистим кеш сесии + таблицю БД для цієї книги
                if (book?.id) {
                  translationsRef.current = {};
                  clearSentenceTranslations(book.id);
                  prefetchedChunks.current.clear();
                  setTranslationsVersion((v) => v + 1);
                }
              }}
              onClose={() => setLangOpen(false)}
            />
          )}
        </View>
      </View>
    </View>
  );

  // Выпадающий список языка перевода рендерится в headerRight (LanguageDropdown).

  // Модалка поиска по книге
  const searchModal = (
    <ModalSheet visible={searchOpen} onClose={() => setSearchOpen(false)} blurBackdrop={false} panelStyle={{ backgroundColor: theme.readerBg }}>
      <View style={[styles.menuCard, { width: '100%', maxWidth: Math.min(a.width - 24, 520) }]}>
          <Text style={[styles.menuTitle, { color: theme.primaryText }]}>{t("Search in book")}</Text>
          <TextField
            radius={10}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t("enter a word or phrase")}
            placeholderTextColor={theme.secondaryText}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.searchClear, metal(theme, 'primary', { size: 10 })]}
            onPress={() => {
              setQuery('');
              setSearchOpen(false);
            }}
          >
            <Text style={{ color: theme.primary }}>{t("Close")}</Text>
          </TouchableOpacity>
        </View>
      </ModalSheet>
  );

  // menuItems/menu (бургер) удалены — язык теперь в dropdown шестеренки.
  const content = list;

  return (
    <Screen bg={false} contentStyle={{ backgroundColor: theme.readerBg, paddingHorizontal: 0, paddingBottom: a.pad, maxWidth: a.readerMaxW, alignSelf: 'center' }}>
      {header}
      {translateError && (
        <TouchableOpacity
          onPress={() => setTranslateError(null)}
          style={{ backgroundColor: theme.danger ?? '#B91C1C', paddingVertical: 6, paddingHorizontal: a.pad }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: a.small_fs, textAlign: 'center' }}>
            {translateError}  ✕
          </Text>
        </TouchableOpacity>
      )}
      {content}
      <TranslationLimitsModal
        visible={limitsOpen}
        onRetry={() => {
          setLimitsOpen(false);
          translateBatch(0, 20); // спроба знову — провайдери з cooldown пропустяться автоматично
        }}
        onClose={() => setLimitsOpen(false)}
      />
      {searchModal}
      {selected && (
        <WordBottomSheet
          word={selected.word}
          sentence={selected.sentence}
          lang={langForSheet}
          targetLang={book?.targetLang ?? settingsTarget}
          bookId={book?.id ?? bookId}
          onClose={() => setSelected(null)}
        />
      )}
      {action && (
        <WordActionSheet
          visible={!!action}
          word={action.word}
          sentence={action.sentence}
          lang={langForSheet}
          targetLang={book?.targetLang ?? settingsTarget}
          bookId={book?.id ?? bookId}
          onClose={() => setAction(null)}
        />
      )}
      <AppSettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <FontSettingsSheet visible={fontOpen} mode={mode} onClose={() => setFontOpen(false)} />
      <SupportAuthorModal
        visible={supportOpen}
        onSupport={onSupportConfirm}
        onDonate={onDonate}
        onDismiss={onSupportDismiss}
      />
      <TouchableOpacity style={[styles.upFab]} onPress={() => scrollRef.current?.scrollToOffset({ offset: 0, animated: true })} hitSlop={8}>
        <Text style={[styles.upFabText, { color: theme.primaryText }]}>↑</Text>
      </TouchableOpacity>
    </Screen>
  );
}

function makeStyles(a: ReturnType<typeof useAdaptive>, theme: ReturnType<typeof useTheme>) {
  const playSz = a.fab();
  const neuBtn = metal(theme, 'circle', { size: playSz });
  const neuUp = metal(theme, 'circle', { size: a.fab() });
  return StyleSheet.create({
    container: { flex: 1, position: 'relative', userSelect: 'none' },
    header: {
      flexDirection: 'column',
      paddingHorizontal: a.pad,
      paddingTop: a.landscape ? 6 : 10,
      paddingBottom: a.landscape ? 4 : 8,
      zIndex: 10,
      maxHeight: a.landscape ? 64 : 96,
      borderRadius: 0,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: a.tiny ? 4 : 8, position: 'relative', zIndex: 10 },
    // Название занимает всю свободную ширину: подпись экрана убрана, выравнивание по левому краю.
    titleGroup: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: a.tiny ? 4 : 8,
      minWidth: 0,
      maxHeight: a.landscape ? 40 : 56,
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: a.tiny ? 6 : 12, flexShrink: 0 },
    langDropdown: { position: 'absolute', top: '100%', right: 0, zIndex: 100 },
    playBtn: { ...neuBtn, borderRadius: playSz / 2 },
    title: { fontSize: a.h2, fontFamily: FONTS.bold },
    langChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, ...metal(theme, 'inset', { radius: 12 }) },
    langChipText: { fontSize: a.small_fs, fontFamily: FONTS.bold },
    // Колонка текста ограничена по ширине на больших мониторах — иначе строки нечитаемо длинные.
    list: { paddingVertical: 12, paddingBottom: 40, width: '100%', maxWidth: a.readerMaxW, alignSelf: 'center', overflow: 'visible' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    footer: { marginVertical: a.gap },
    modalBackdrop: { flex: 1, backgroundColor: theme.backdrop, justifyContent: 'flex-start' },
    menuCard: {
      maxHeight: a.height * (a.landscape ? 0.85 : 0.7),
      borderBottomLeftRadius: a.radius + 4,
      borderBottomRightRadius: a.radius + 4,
      padding: a.pad,
      width: '100%',
      maxWidth: a.isDesktop ? 520 : undefined,
      alignSelf: a.isDesktop ? 'center' : 'auto',
    },
    menuTitle: { fontSize: a.h2, fontFamily: FONTS.bold, marginBottom: 8 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: a.tiny ? 9 : 12, borderBottomWidth: 0.5, gap: 12 },
    menuItemText: { flex: 1, fontSize: a.body },
    searchInput: { borderWidth: 0, paddingHorizontal: 12, paddingVertical: a.tiny ? 8 : 10, fontSize: a.body, marginTop: 8, color: theme.primaryText },
    searchClear: { marginTop: 12, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    progressTrack: { height: 3, width: '100%', marginTop: 8 },
    progressFill: { height: 3 },
    upFab: {
      position: 'absolute',
      right: a.pad,
      bottom: a.tabBarH + a.pad,
      ...neuUp,
      width: 45,
      height: 45,
      borderRadius: 45 / 2,
    },
    upFabText: { fontSize: a.fs(22), fontFamily: FONTS.bold, color: theme.primaryText },
  });
}
