// screens/ReaderScreen.tsx
// Чтение: оригинал + параллельный перевод под каждым предложением.
// - перевод ленивый: после остановки скролла (600мс) переводим видимое окно
// - адаптация под широкие экраны: >720px → 2 колонки (numColumns)
// - клик по слову → BottomSheet (Шаг 4, пока заглушка onWordPress)
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { COLORS, SIZES, FONTS } from '../theme/constants';
import { useLibraryStore } from '../store/libraryStore';
import { useSettingsStore } from '../store/settingsStore';
import { translateCached } from '../services/translationService';
import SentenceRow from '../components/SentenceRow';

interface RouteParams {
  bookId: string;
}

const SCROLL_STOP_MS = 600; // ждём остановки скролла перед пакетным переводом
const BATCH = 8; // сколько предложений вокруг видимого окна переводим за раз

export default function ReaderScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { bookId } = route.params as RouteParams;

  const book = useLibraryStore((s) => s.books.find((b) => b.id === bookId));
  const updateParagraphTranslation = useLibraryStore((s) => s.updateParagraphTranslation);
  const targetLang = useSettingsStore((s) => s.targetLang);

  const { width } = useWindowDimensions();
  const isWide = width >= 720;
  const numColumns = isWide ? 2 : 1;

  const [loadingSet, setLoadingSet] = useState<Set<number>>(new Set());
  const visibleRef = useRef<{ first: number; last: number }>({ first: 0, last: 20 });
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookRef = useRef(book);
  bookRef.current = book;

  // вызывается при клике на слово (пока заглушка — в Шаге 4 подключим BottomSheet)
  const onWordPress = useCallback((word: string, sentence: string) => {
    navigation.navigate('WordSheet', { word, sentence, lang: bookRef.current?.language }) ;
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
      } catch (e) {
        // при ошибке снимаем флаги загрузки; повтор попытки при следующем скролле
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
      // вычисляем примерное окно видимых строк по позиции скролла
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

  // первичный перевод первых строк при открытии
  useEffect(() => {
    translateBatch(0, BATCH);
    return () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  if (!book) {
    return (
      <View style={styles.center}>
        <Text style={styles.missing}>Книга не найдена.</Text>
      </View>
    );
  }

  return (
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
        key={numColumns} // пересоздаём список при смене числа колонок
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
