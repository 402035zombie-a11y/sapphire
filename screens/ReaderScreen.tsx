// screens/ReaderScreen.tsx
// Чтение: оригинал + параллельный перевод под каждым предложением.
// - перевод ленивый: после остановки скролла (600мс) переводим видимое окно
// - адаптация под широкие экраны: >720px → 2 колонки
// - клик по слову → BottomSheet с переводом и сохранением в словарь
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { COLORS, SIZES, FONTS } from '../theme/constants';
import { useLibraryStore } from '../store/libraryStore';
import { useSettingsStore } from '../store/settingsStore';
import { translateCached } from '../services/translationService';
import SentenceRow from '../components/SentenceRow';
import WordBottomSheet from '../components/WordBottomSheet';

interface RouteParams {
  bookId: string;
}

const SCROLL_STOP_MS = 600;
const BATCH = 8;

export default function ReaderScreen({ route }: { route: any }) {
  const { bookId } = route.params as RouteParams;

  const book = useLibraryStore((s) => s.books.find((b) => b.id === bookId));
  const updateParagraphTranslation = useLibraryStore((s) => s.updateParagraphTranslation);
  const targetLang = useSettingsStore((s) => s.targetLang);

  const { width } = useWindowDimensions();
  const isWide = width >= 720;
  const numColumns = isWide ? 2 : 1;

  const [loadingSet, setLoadingSet] = useState<Set<number>>(new Set());
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [selected, setSelected] = useState<{ word: string; sentence: string } | null>(null);

  const visibleRef = useRef<{ first: number; last: number }>({ first: 0, last: 20 });
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookRef = useRef(book);
  bookRef.current = book;

  const onWordPress = useCallback((word: string, sentence: string) => {
    setSelected({ word, sentence });
    bottomSheetRef.current?.present();
  }, []);

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
        for (const idx of indices) {
          const p = bookRef.current?.paragraphs[idx];
          if (!p) continue;
          const res = await translateCached(p.original, from, targetLang);
          updateParagraphTranslation(b.id, idx, res.text);
          setLoadingSet((prev) => {
            const next = new Set(prev);
            next.delete(idx);
            return next;
          });
        }
      } catch {
        setLoadingSet(new Set());
      }
    },
    [targetLang, updateParagraphTranslation],
  );

  const onScrollBeginDrag = useCallback(() => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
  }, []);

  const onMomentumScrollEnd = useCallback(
    (e: any) => {
      const y = e.nativeEvent.contentOffset.y;
      const approxFirst = Math.max(0, Math.floor(y / 80) - 2);
      const approxLast = approxFirst + BATCH * 2;
      visibleRef.current = { first: approxFirst, last: approxLast };
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        translateBatch(visibleRef.current.first, visibleRef.current.last);
      }, SCROLL_STOP_MS);
    },
    [translateBatch],
  );

  useEffect(() => {
    translateBatch(0, BATCH);
    return () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  );

  const langForSheet = book?.language ?? 'auto';
  const selectedSentence = selected?.sentence ?? '';

  if (!book) {
    return (
      <View style={styles.center}>
        <Text style={styles.missing}>Книга не найдена.</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {book.title}
            </Text>
            <Text style={styles.subtitle}>
              {book.language === 'auto' ? 'Авто' : book.language.toUpperCase()} → {targetLang.toUpperCase()}
              {isWide ? ' · 2 колонки' : ''}
            </Text>
          </View>

          <FlatList
            data={book.paragraphs}
            keyExtractor={(p) => String(p.index)}
            numColumns={numColumns}
            key={numColumns}
            contentContainerStyle={styles.list}
            columnWrapperStyle={isWide ? styles.columnWrap : undefined}
            onScrollBeginDrag={onScrollBeginDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            initialNumToRender={BATCH}
            ListFooterComponent={
              loadingSet.size > 0 ? (
                <ActivityIndicator style={styles.footer} color={COLORS.secondaryText} />
              ) : null
            }
            renderItem={({ item }) => (
              <SentenceRow
                index={item.index}
                original={item.original}
                translation={item.translation}
                loading={loadingSet.has(item.index)}
                onTranslate={(idx) => translateBatch(idx, idx)}
                onWordPress={onWordPress}
              />
            )}
          />
        </View>

        <BottomSheetModal
          ref={bottomSheetRef}
          index={0}
          snapPoints={['50%']}
          backdropComponent={renderBackdrop}
          onDismiss={() => setSelected(null)}
        >
          {selected && (
            <WordBottomSheet
              word={selected.word}
              sentence={selectedSentence}
              lang={langForSheet}
              onClose={() => bottomSheetRef.current?.dismiss()}
            />
          )}
        </BottomSheetModal>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SIZES.padding },
  header: { paddingBottom: SIZES.gap },
  title: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.primaryText },
  subtitle: { color: COLORS.secondaryText, fontSize: 13, marginTop: 2 },
  list: { paddingBottom: 40 },
  columnWrap: { justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  missing: { color: COLORS.secondaryText },
  footer: { marginVertical: 16 },
});
