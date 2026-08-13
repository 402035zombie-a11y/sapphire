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
import { useSettingsStore } from '../store/settingsStore';
import { useSupportStore } from '../store/supportStore';
import { translateCached } from '../services/translationService';
import { showSupportAd } from '../services/monetization';
import SupportAuthorModal from '../components/SupportAuthorModal';
import SentenceRow from '../components/SentenceRow';
import WordBottomSheet from '../components/WordBottomSheet';
import WordActionSheet from '../components/WordActionSheet';
import { useDictionaryStore } from '../store/dictionaryStore';
import { normalizeWord } from '../utils/wordTokenizer';
import Marquee from '../components/Marquee';
import BackFab from '../components/BackFab';
import IconButton from '../components/ui/IconButton';
import AppSettingsModal from '../components/AppSettingsModal';
import FontSettingsSheet from '../components/FontSettingsSheet';

interface RouteParams {
  bookId: string;
  mode?: 'read' | 'dual';
}

const BATCH = 8;

export default function ReaderScreen({ route }: { route: any }) {
  const { bookId } = route.params as RouteParams;
  const mode: 'read' | 'dual' = (route.params as RouteParams)?.mode === 'read' ? 'read' : 'dual';
  const theme = useTheme();
  const t = useT();
  const navigation = useNavigation<any>();
  const a = useAdaptive();
  const styles = React.useMemo(() => makeStyles(a, theme), [a, theme]);

  const book = useLibraryStore((s) => s.books.find((b) => b.id === bookId));
  const updateParagraphsTranslations = useLibraryStore((s) => s.updateParagraphsTranslations);
  const setProgress = useLibraryStore((s) => s.setProgress);
  const toggleBookmark = useLibraryStore((s) => s.toggleBookmark);
  const settingsTarget = useSettingsStore((s) => s.targetLang);
  const reader = useSettingsStore((s) => s.reader);
  const addEntry = useDictionaryStore((s) => s.addEntry);
  const hasWord = useDictionaryStore((s) => s.hasWord);
  const targetLang = book?.targetLang ?? settingsTarget ?? 'en';

  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

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
  const cancelledRef = useRef(false);
  const [action, setAction] = useState<{ word: string; sentence: string } | null>(null);

  const addToDictionary = useCallback(
    (word: string, sentence: string) => {
      if (!book) return;
      const norm = normalizeWord(word);
      const lang = book.language === 'auto' ? 'en' : book.language;
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

  const speakFrom = useCallback(
    (start: number) => {
      if (!book || !isWeb || !('speechSynthesis' in window)) return;
      const paras = book.paragraphs;
      let i = start;
      const lang = book.language === 'auto' ? 'en' : book.language;
      const step = () => {
        if (cancelledRef.current) {
          setIsSpeaking(false);
          setPaused(true);
          return;
        }
        if (i >= paras.length) {
          setIsSpeaking(false);
          setPaused(false);
          setCurrentIndex(0);
          return;
        }
        const u = new SpeechSynthesisUtterance(paras[i].original);
        u.lang = lang;
        u.onend = () => {
          if (cancelledRef.current) {
            setIsSpeaking(false);
            setPaused(true);
            return;
          }
          i += 1;
          setCurrentIndex(i);
          step();
        };
        setCurrentIndex(i);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      };
      cancelledRef.current = false;
      setIsSpeaking(true);
      setPaused(false);
      step();
    },
    [book, isWeb],
  );

  const playBook = useCallback(() => {
    if (!book) return;
    if (isSpeaking) return;
    if (paused) {
      speakFrom(currentIndex);
    } else {
      speakFrom(0);
    }
  }, [book, isSpeaking, paused, currentIndex, speakFrom]);

  const pauseBook = useCallback(() => {
    if (!isWeb || !('speechSynthesis' in window)) return;
    cancelledRef.current = true;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setPaused(true);
  }, [isWeb]);

  const stopBook = useCallback(() => {
    if (!isWeb || !('speechSynthesis' in window)) return;
    cancelledRef.current = true;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setPaused(false);
    setCurrentIndex(0);
  }, [isWeb]);

  const viewableRef = useRef<Set<number>>(new Set());

  const visibleRef = useRef<{ first: number; last: number }>({ first: 0, last: 20 });
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookRef = useRef(book);
  bookRef.current = book;

  const translateBatch = useCallback(
    async (first: number, last: number) => {
      const b = bookRef.current;
      if (!b) return;
      const from = b.language === 'auto' ? 'auto' : b.language;
      const indices: number[] = [];
      for (let i = first; i <= last && i < b.paragraphs.length; i++) {
        const p = b.paragraphs[i];
        if (p && !p.translation) indices.push(i);
      }
      if (indices.length === 0) return;

      setLoadingSet((prev) => new Set([...prev, ...indices]));
      try {
        // переводим чанком параллельно (до 8 за раз), без последовательного await на каждый
        const results = await Promise.all(
          indices.map(async (idx) => {
            const p = bookRef.current?.paragraphs[idx];
            if (!p) return null;
            try {
              const res = await translateCached(p.original, from, targetLang);
              return { index: idx, translation: res.text } as { index: number; translation: string };
            } catch {
              return null;
            }
          }),
        );
        const ok = results.filter((r): r is { index: number; translation: string } => r !== null);
        if (ok.length) updateParagraphsTranslations(b.id, ok);
      } catch {
        // игнорируем — перевод восстановится при следующем показе
      } finally {
        setLoadingSet((prev) => {
          const next = new Set(prev);
          indices.forEach((i) => next.delete(i));
          return next;
        });
      }
    },
    [targetLang, updateParagraphsTranslations],
  );


  const onViewableItemsChanged = useCallback(
    ({ viewableItems, changed }: any) => {
      const set = new Set<number>();
      for (const vi of viewableItems) {
        const idx = vi.index;
        if (typeof idx === 'number') set.add(idx);
      }
      viewableRef.current = set;
      // абзац в окне → переводим СРАЗУ (без задержки), если ещё нет перевода
      set.forEach((idx) => {
        if (!bookRef.current?.paragraphs[idx]?.translation) translateBatch(idx, idx);
      });
    },
    [],
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
        if (bookRef.current?.paragraphs[idx]?.translation) continue;
        translateBatch(idx, idx);
      }
      const total = bookRef.current?.paragraphs.length ?? 1;
      const first = visible.size ? Math.min(...visible) : visibleRef.current.first;
      const atEnd = first >= total - 2;
      const pct = atEnd ? 1 : Math.min(1, Math.max(0, first / total));
      setProgress(bookId, pct, Math.max(0, first));
    },
    [translateBatch, bookId, setProgress],
  );

  // Окно «Поддержать автора» — плата за бесплатное приложение.
  // Показываем при открытии книги с задержкой 20с, если пользователь ещё не задонатил
  // (флаг dontShowSupport в supportStore). Чтение не блокируется.
  const dontShowSupport = useSupportStore((s) => s.dontShowSupport);
  useEffect(() => {
    setSupportOpen(false);
    if (dontShowSupport) return;
    const t = setTimeout(() => setSupportOpen(true), 20000);
    return () => clearTimeout(t);
  }, [bookId, dontShowSupport]);

  const onSupportConfirm = async () => {
    setSupportOpen(false);
    await showSupportAd();
  };

  // Донат/подписка: ставим флаг «больше не показывать» и запускаем платёж (mock в вебе).
  const onDonate = () => {
    setSupportOpen(false);
    useSupportStore.getState().setDontShowSupport(true);
    if (Platform.OS === 'web') {
      window.alert(t("Thank you for your support! (donation/subscription is a stub in the web version)"));
    }
    // TODO (натив): здесь requestPurchase() из react-native-iap / открытие платёжной ссылки.
  };

  useEffect(() => {
    // В режиме 'read' перевод не грузим (пользователь хочет читать оригинал).
    if (mode === 'read') return;
    // Перевод срабатывает по скролл-стопу (onMomentumScrollEnd) и при удержании абзаца в окне >2с.
    const paras = bookRef.current?.paragraphs ?? [];
    for (let i = 0; i <= BATCH && i < paras.length; i++) {
      if (!bookRef.current?.paragraphs[i]?.translation) translateBatch(i, i);
    }
    return () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, mode]);

  // прыжок к разделу/закладке из оглавления или списка закладок
  useEffect(() => {
    const jumpTo = (route.params as any)?.jumpTo;
    if (jumpTo == null || !scrollRef.current) return;
    const idx = Math.max(0, Math.min(jumpTo, bookRef.current?.paragraphs.length ?? 1));
    const t = setTimeout(() => {
      scrollRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.2 });
    }, 300);
    return () => clearTimeout(t);
  }, [route.params]);

  const speak = useCallback(
    (text: string) => {
      if (isWeb && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = book?.language && book.language !== 'auto' ? book.language : 'en';
        u.onend = () => setIsSpeaking(false);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
        setIsSpeaking(true);
      }
    },
    [isWeb, book],
  );

  const copyParagraph = useCallback(
    (text: string, translation?: string) => {
      const payload = translation ? `${text}\n${translation}` : text;
      if (isWeb && navigator.clipboard) {
        navigator.clipboard.writeText(payload).then(
          () => Alert.alert(t("Copied"), t("Paragraph (original + translation) copied to clipboard.")),
          () => Alert.alert(t("Copy error"), t("Could not copy.")),
        );
      } else {
        Alert.alert(t("Copied"), payload);
      }
    },
    [isWeb],
  );

  const langForSheet = book?.language && book.language !== 'auto' ? book.language : 'en';

  if (!book) {
    return (
      <View style={[styles.center, { backgroundColor: theme.readerBg }]}>
        <Text style={{ color: theme.readerText }}>{t("Book not found.")}</Text>
      </View>
    );
  }



  const isPdf = book.format === 'pdf';
  const list = (
    <FlatList
      ref={scrollRef}
      style={{ flex: 1 }}
      data={book.paragraphs}
      keyExtractor={(p) => String(p.index)}
      numColumns={1}
      contentContainerStyle={[styles.list, { backgroundColor: theme.readerBg, paddingHorizontal: reader.pageMargins ? reader.margin : 0 }]}
      onScrollBeginDrag={onScrollBeginDrag}
      onMomentumScrollEnd={onMomentumScrollEnd}
      initialNumToRender={BATCH}
      initialScrollIndex={Math.min(book.lastPosition ?? 0, book.paragraphs.length - 1)}
      getItemLayout={(_, index) => ({ length: 80, offset: 80 * index, index })}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{ itemVisiblePercentThreshold: 50, minimumViewTime: 50 }}
      ListFooterComponent={
        loadingSet.size > 0 ? <ActivityIndicator style={styles.footer} color={theme.secondaryText} /> : null
      }
      renderItem={({ item }) => (
        <SentenceRow
          index={item.index}
          original={item.original}
          translation={item.translation}
          loading={loadingSet.has(item.index)}
          showTranslation={mode === 'dual'}
          fontSize={reader.fontSize}
          lineHeight={reader.lineHeight}
          justify={reader.justify}
          fontFamily={reader.fontFamily}
          fontWeight={reader.fontWeight}
          textAlign={reader.textAlign}
          pageMargins={reader.pageMargins}
          bookmarked={book.bookmarks?.includes(item.index) ?? false}
          onToggleBookmark={() => toggleBookmark(book.id, item.index)}
          onCopy={() => copyParagraph(item.original, item.translation)}
          onSpeak={speak}
          onTranslate={() => translateBatch(item.index, item.index)}
          showSpeak={reader.showSpeakButton ?? true}
          showTranslate={reader.showTranslateButton ?? true}
          onWordPress={onWordPress}
          forceHideTranslation={mode === 'read'}
          mode={mode}
          query={query}
        />
      )}
    />
  );

  const header = (
    <View style={[styles.header, metal(theme, 'raised', { radius: a.radius })]}>
      <View style={[styles.headerRow, { paddingLeft: a.pad, paddingRight: a.pad, paddingTop: a.small ? 4 : 6, paddingBottom: a.small ? 4 : 6, maxHeight: a.small ? 56 : 68 }]}>
        <IconButton icon="arrow-back" onPress={() => navigation.goBack()} variant="circle" size={a.fab()} hitSlop={8} />
        <View style={styles.titleGroup}>
          <Marquee text={book.title} textStyle={[styles.title, { color: theme.primaryText }]} />
        </View>
        {(mode === 'read') && (
          <View style={styles.centerPlay}>
            {isSpeaking ? (
              <React.Fragment>
                <IconButton icon="pause" onPress={pauseBook} variant="circle" size={a.fab()} color={theme.primary} hitSlop={10} />
                <IconButton icon="close" onPress={stopBook} variant="circle" size={a.fab()} color={theme.primary} hitSlop={10} />
              </React.Fragment>
            ) : (
              <IconButton icon="volume" onPress={playBook} variant="circle" size={a.fab()} color={theme.primary} hitSlop={10} />
            )}
          </View>
        )}
        <View style={[styles.headerRight, { position: 'relative' }]}>
          <IconButton icon="settings" onPress={() => setFontOpen(true)} variant="circle" size={a.fab()} hitSlop={8} />
          <IconButton icon="heart" onPress={() => setSupportOpen(true)} variant="circle" size={a.fab()} hitSlop={8} />
        </View>
      </View>
    </View>
  );

  // Выпадающий список языка перевода рендерится в headerRight (LanguageDropdown).

  // Модалка поиска по книге
  const searchModal = (
    <ModalSheet visible={searchOpen} onClose={() => setSearchOpen(false)} panelStyle={{ backgroundColor: theme.readerBg }}>
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
  const content = isPdf ? (
    <View style={{ flex: 1, backgroundColor: theme.readerBg }}>
      {Platform.OS === 'web' ? (
        <iframe
          src={book.pdfUri}
          style={{ width: '100%', height: '100%', borderWidth: 0 }}
          title={book.title}
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{ color: theme.readerText }}>
            {t("PDF viewing is available only in the web version. On a device, open the file with an external app.")}
          </Text>
        </View>
      )}
    </View>
  ) : (
    list
  );

  return (
    <Screen bg={false} contentStyle={{ backgroundColor: theme.readerBg, padding: a.pad, maxWidth: a.readerMaxW, alignSelf: 'center' }}>
      {header}
      {content}
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
          onSpeakFromHere={(s) => speak(s)}
          onAddToDictionary={(w, s) => addToDictionary(w, s)}
          onClose={() => setAction(null)}
        />
      )}
      <AppSettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <FontSettingsSheet visible={fontOpen} mode={mode} onClose={() => setFontOpen(false)} />
      <SupportAuthorModal
        visible={supportOpen}
        onSupport={onSupportConfirm}
        onDonate={onDonate}
        onDismiss={() => setSupportOpen(false)}
      />
      <TouchableOpacity style={[styles.upFab]} onPress={() => scrollRef.current?.scrollToIndex({ index: 0, animated: true })} hitSlop={8}>
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
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: a.tiny ? 6 : 12, flexShrink: 0, marginRight: a.pad, marginTop: a.tiny ? 2 : 4 },
    langDropdown: { position: 'absolute', top: '100%', right: 0, zIndex: 100 },
    centerPlay: { flex: 1, flexShrink: 0, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: a.tiny ? 2 : 6 },
    playBtn: { ...neuBtn, borderRadius: playSz / 2 },
    title: { fontSize: a.h2, fontFamily: FONTS.bold },
    langChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, ...metal(theme, 'inset', { radius: 12 }) },
    langChipText: { fontSize: a.small_fs, fontFamily: FONTS.bold },
    // Колонка текста ограничена по ширине на больших мониторах — иначе строки нечитаемо длинные.
    list: { paddingVertical: 12, paddingBottom: 40, width: '100%', maxWidth: a.readerMaxW, alignSelf: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    footer: { marginVertical: a.gap },
    modalBackdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-start' },
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
      right: 30,
      bottom: 30,
      ...neuUp,
      width: 45,
      height: 45,
      borderRadius: 45 / 2,
    },
    upFabText: { fontSize: a.fs(22), fontFamily: FONTS.bold, color: theme.primaryText },
  });
}
