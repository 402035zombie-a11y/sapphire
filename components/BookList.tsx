/**
 * components/BookList.tsx — E8: віртуалізований список книг (FlashList замість ScrollView/FlatList).
 *
 * ЧОМУ ТАК (для наступного агента):
 *  - Старий LibraryScreen рендерив книги у ScrollView → повільно на великих бібліотеках.
 *  - FlashList (Shopify) віртуалізує → плавний скрол, сталі витрати пам'яті.
 *  - Цей компонент повністю відтворює існуючу картку (cover + wordCount + delete + press),
 *    щоб заміна інлайн-мапи у LibraryScreen не втратила функцій.
 *  - Підключення: замінити <ScrollView>{visibleBooks.map(...)}</ScrollView> на
 *    <BookList books={visibleBooks} bookWordCount={...} onOpen={openReader} onRemove={removeBook} />
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Book } from '../store/libraryStore';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { useT } from '../i18n';
import { metal } from '../theme/neu';
import Icon from './Icon';

interface Props {
  books: Book[];
  bookWordCount?: Map<string, number>;
  onOpen: (bookId: string) => void;
  onRemove: (bookId: string) => void;
}

function coverColor(title: string): string {
  const palette = ['#C8741E', '#5B8C5A', '#4A6FA5', '#A5554E', '#7A6A9E'];
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

function BookCard({ item, wordCount, onOpen, onRemove }: {
  item: Book; wordCount: number; onOpen: (id: string) => void; onRemove: (id: string) => void;
}) {
  const theme = useTheme();
  const a = useAdaptive();
  const t = useT();
  // B10/HWUI: memoize metal()-стилі — НЕ перераховувати тіні при кожному render (скрол FlatList).
  // Залежність від [theme, a.radius, a.scale] — перерахунок тільки при зміні теми/розміру.
  const raisedStyle = React.useMemo(() => metal(theme, 'raised', { radius: a.radius }), [theme, a.radius, a.scale]);
  const circleStyle = React.useMemo(
    () => metal(theme, 'circleInset', { size: a.dim(0.05, 28, 38) }),
    [theme, a.radius, a.scale],
  );
  return (
    <TouchableOpacity
      style={[styles.bookRow, raisedStyle]}
      onPress={() => onOpen(item.id)}
    >
      <View style={[styles.cover, item.coverImage ? {} : { backgroundColor: coverColor(item.title) }]}>
        {item.coverImage ? (
          <Image source={{ uri: item.coverImage }} style={styles.coverImg} resizeMode="cover" />
        ) : (
          <Text style={[styles.coverText, { color: '#FBF4E4' }]}>{(item.title || '?').trim().charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={{ flex: 1, flexShrink: 1, marginLeft: Math.round(12 * a.scale), minWidth: 0 }}>
        <Text style={[styles.bookTitle, { color: theme.primaryText }]} numberOfLines={2}>{item.title}</Text>
        <Text style={[styles.bookMeta, { color: theme.secondaryText }]} numberOfLines={2}>
          {item.author ? `${item.author} · ` : ''}
          {item.language.toUpperCase()} → {(item.targetLang ?? item.language).toUpperCase()} · {item.paragraphs.length} {t('par.')}{wordCount ? ` · ${wordCount} ${t('words')}` : ''}
        </Text>
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity
          onPress={(e: any) => { e?.stopPropagation?.(); onRemove(item.id); }}
          hitSlop={10}
          style={[circleStyle, { padding: 0 }]}
        >
          <Icon name="close" size={a.dim(0.03, 16, 22)} color={theme.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export function BookList({ books, bookWordCount, onOpen, onRemove }: Props) {
  const a = useAdaptive();
  const theme = useTheme();
  return (
    <FlashList
      data={books}
      keyExtractor={(b) => b.id}
      contentContainerStyle={{ paddingHorizontal: a.pad, paddingTop: a.insetTop + a.pad + a.fab() + a.gap, paddingBottom: a.tabBarH + a.fab() * 2 + a.gap * 2 }}
      renderItem={({ item }) => (
        <View style={a.columns > 1 ? { width: `${100 / a.columns - 2}%` } : undefined}>
          <BookCard
            item={item}
            wordCount={bookWordCount?.get(item.id) || 0}
            onOpen={onOpen}
            onRemove={onRemove}
          />
        </View>
      )}
      ListEmptyComponent={() => (
        <Text style={{ color: theme.secondaryText, padding: 24, textAlign: 'center' }}>Library is empty.</Text>
      )}
    />
  );
}

const styles = StyleSheet.create({
  bookRow: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 8, borderRadius: 12 },
  cover: { width: 40, height: 56, borderRadius: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverImg: { width: 40, height: 56, borderRadius: 6 },
  coverText: { fontSize: 22, fontWeight: '700' },
  bookTitle: { fontSize: 16, fontWeight: '600' },
  bookMeta: { fontSize: 13, marginTop: 2 },
  rowActions: { marginLeft: 8 },
});
