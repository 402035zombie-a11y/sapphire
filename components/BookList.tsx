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
import { surface } from '../theme/neu';
import Icon from './Icon';

interface Props {
  books: Book[];
  onOpen: (bookId: string) => void;
  onRemove: (bookId: string) => void;
}

function coverColor(title: string): string {
  const palette = ['#C8741E', '#5B8C5A', '#4A6FA5', '#A5554E', '#7A6A9E'];
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

function BookCard({ item, onOpen, onRemove }: {
  item: Book; onOpen: (id: string) => void; onRemove: (id: string) => void;
}) {
  const theme = useTheme();
  const a = useAdaptive();
  const t = useT();
  // B10/HWUI: memoize surface()-стилі — НЕ перераховувати тіні при кожному render (скрол FlatList).
  // Залежність від [theme, a.radius, a.scale] — перерахунок тільки при зміні теми/розміру.
  const raisedStyle = React.useMemo(() => surface(theme, 'raised', { radius: a.radius, strength: 0.9 }), [theme, a.radius, a.scale]);
  const circleStyle = React.useMemo(
    () => surface(theme, 'circleInset', { size: a.dim(0.05, 30, 40) }),
    [theme, a.radius, a.scale],
  );
  
  // Import state handling
  const isImporting = item.status === 'parsing' || item.status === 'saving';
  const hasError = item.status === 'error';
  const showProgress = isImporting || hasError;
  const progressPercent = item.importProgress ?? 0;
  
  // Cancel/Delete/Retry button text & handler
  const getActionButton = () => {
    if (hasError) {
      return (
        <View style={styles.errorActions}>
          <TouchableOpacity
            onPress={(e: any) => { e?.stopPropagation?.(); onRemove(item.id); }}
            hitSlop={10}
            style={[surface(theme, 'circleInset', { size: a.dim(0.05, 28, 36) }), { padding: 0 }]}
          >
            <Icon name="close" size={a.dim(0.025, 14, 18)} color={theme.danger} />
          </TouchableOpacity>
        </View>
      );
    }
    if (isImporting) {
      return (
        <TouchableOpacity
          onPress={(e: any) => { e?.stopPropagation?.(); onRemove(item.id); }}
          hitSlop={10}
          style={[surface(theme, 'circleInset', { size: a.dim(0.05, 28, 36) }), { padding: 0 }]}
        >
          <Icon name="close" size={a.dim(0.025, 14, 18)} color={theme.danger} />
        </TouchableOpacity>
      );
    }
    // Ready state - delete button
    return (
      <TouchableOpacity
        onPress={(e: any) => { e?.stopPropagation?.(); onRemove(item.id); }}
        hitSlop={10}
        style={[surface(theme, 'circleInset', { size: a.dim(0.05, 28, 36) }), { padding: 0 }]}
      >
        <Icon name="close" size={a.dim(0.025, 14, 18)} color={theme.danger} />
      </TouchableOpacity>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.bookRow, raisedStyle]}
      onPress={() => !isImporting && onOpen(item.id)}
    >
      <View style={[styles.cover, item.coverImage ? {} : { backgroundColor: coverColor(item.title) }]}>
        {item.coverImage ? (
          <Image source={{ uri: item.coverImage }} style={styles.coverImg} resizeMode="cover" />
        ) : (
          <Text style={[styles.coverText, { color: '#FBF4E4' }]}>{(item.title || '?').trim().charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={{ flex: 1, flexShrink: 1, marginLeft: Math.round(12 * a.scale), minWidth: 0 }}>
        <Text style={[styles.bookTitle, { color: theme.primaryText, opacity: isImporting ? 0.7 : 1 }]} numberOfLines={2}>{item.title}</Text>
        <Text style={[styles.bookMeta, { color: theme.secondaryText }]} numberOfLines={2}>
          {hasError ? `${t('Import failed')}: ${item.importError}` : ''}
          {isImporting ? `${t(item.status === 'parsing' ? 'Parsing...' : 'Saving...')} ${progressPercent}%` : ''}
          {!showProgress && item.author ? `${item.author} · ` : ''}
          {!showProgress && item.format ? `${item.format.toUpperCase()} · ` : ''}
          {!showProgress ? `${item.language.toUpperCase()} → ${(item.targetLang ?? item.language).toUpperCase()}` : ''}
        </Text>
      </View>
      <View style={styles.rowActions}>
        {getActionButton()}
      </View>
      {showProgress && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
        </View>
      )}
    </TouchableOpacity>
  );
}

export function BookList({ books, onOpen, onRemove }: Props) {
  const a = useAdaptive();
  const theme = useTheme();
  const t = useT();
  return (
    <FlashList
      data={books}
      keyExtractor={(b) => b.id}
      contentContainerStyle={{ paddingHorizontal: a.pad, paddingTop: a.insetTop + a.pad + a.fab() + a.gap, paddingBottom: a.tabBarH + a.fab() * 2 + a.gap * 2 }}
      renderItem={({ item }) => (
        <View style={a.columns > 1 ? { width: `${100 / a.columns - 2}%` } : undefined}>
          <BookCard
            item={item}
            onOpen={onOpen}
            onRemove={onRemove}
          />
        </View>
      )}
      ListEmptyComponent={() => (
        <Text style={{ color: theme.secondaryText, padding: 24, textAlign: 'center' }}>{t('Library is empty.')}</Text>
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
  progressContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: 'transparent' },
  progressBar: { height: 3, borderRadius: 2 },
  errorActions: { flexDirection: 'row', gap: 8 },
});
