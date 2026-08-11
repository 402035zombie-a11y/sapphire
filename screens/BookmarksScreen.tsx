// screens/BookmarksScreen.tsx
// Закладки книги: список отмеченных абзацев. Тап → прыжок к абзацу в ридере (jumpTo).
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import BackFab from '../components/BackFab';
import Icon from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { useLibraryStore } from '../store/libraryStore';
import { FONTS } from '../theme/constants';
import { useAdaptive } from '../theme/useAdaptive';
import { neuRaised, neuShadowPad } from '../theme/neu';
import { useT } from '../i18n';

export default function BookmarksScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const bookId: string = route.params?.bookId;
  const theme = useTheme();
  const t = useT();
  const a = useAdaptive();
  const styles = React.useMemo(() => makeStyles(a), [a]);
  const book = useLibraryStore((s) => s.books.find((b) => b.id === bookId));

  const items = React.useMemo(() => {
    if (!book) return [];
    return (book.bookmarks ?? [])
      .map((idx) => book.paragraphs[idx])
      .filter(Boolean)
      .map((p) => ({ index: p.index, original: p.original, translation: p.translation }));
  }, [book]);

  const open = (paragraphIndex: number) => {
    navigation.navigate('Reader', { bookId, jumpTo: paragraphIndex });
  };

  if (!book) {
    return (
      <View style={[styles.center, { backgroundColor: 'transparent' }]}>
        <Text style={{ color: theme.secondaryText }}>{t('Book not found.')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <BackFab onPress={() => navigation.goBack()} />
      <Text style={[styles.title, { color: theme.primaryText }]}>{t('Bookmarks')} · {book.title}</Text>
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.index)}
        contentContainerStyle={{ paddingBottom: 24, padding: neuShadowPad() }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.secondaryText }]}>
            {t('No bookmarks yet. Open the book and tap ★ on the paragraph you need.')}
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.row, neuRaised(theme, a.radius), { borderBottomWidth: 0 }]} onPress={() => open(item.index)}>
            <Icon name="bookmark-filled" size={18} color={theme.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.snippet, { color: theme.primaryText }]} numberOfLines={2}>
                {item.original}
              </Text>
              {item.translation ? (
                <Text style={[styles.trans, { color: theme.secondaryText }]} numberOfLines={1}>
                  {item.translation}
                </Text>
              ) : null}
            </View>
            <Icon name="chevron-forward" size={18} color={theme.secondaryText} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function makeStyles(a: ReturnType<typeof useAdaptive>) {
  return StyleSheet.create({
    container: { flex: 1, padding: a.pad, paddingTop: a.pad + Math.round(Math.max(34, 40 * a.scale)) + a.gap, width: '100%', maxWidth: a.contentMaxW, alignSelf: 'center' },
    title: { fontSize: a.title, fontFamily: FONTS.bold, marginBottom: 12, paddingLeft: a.icon(40) },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: a.tiny ? 9 : 12, borderBottomWidth: 0.5, gap: 8 },
    snippet: { fontSize: a.body, lineHeight: a.body * 1.4 },
    trans: { fontSize: a.small_fs, fontStyle: 'italic', marginTop: 2 },
    empty: { textAlign: 'center', marginTop: 40, fontSize: a.body },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
}
