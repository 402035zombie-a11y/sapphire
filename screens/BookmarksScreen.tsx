// screens/BookmarksScreen.tsx
// Закладки книги: список отмеченных абзацев. Тап → прыжок к абзацу в ридере (jumpTo).
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import IconButton from '../components/ui/IconButton';
import Icon from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { useLibraryStore } from '../store/libraryStore';
import { FONTS } from '../theme/constants';
import { useAdaptive } from '../theme/useAdaptive';
import { metal, neuShadowPad } from '../theme/neu';
import { useT } from '../i18n';
import Screen from '../components/Screen';

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
    <Screen contentStyle={{}}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: a.tiny ? 4 : 8, paddingHorizontal: a.pad, paddingTop: a.pad, paddingBottom: a.small ? 4 : 8 }}>
        <IconButton icon="arrow-back" onPress={() => navigation.goBack()} variant="circle" size={a.fab()} hitSlop={8} />
        <Text style={[styles.title, { color: theme.primaryText, flex: 1 }]}>{t('Bookmarks')} · {book.title}</Text>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: neuShadowPad(),
          paddingBottom: a.tabBarH + a.pad * 2 + a.gap,
        }}
      >
        {items.length === 0 ? (
          <Text style={[styles.empty, { color: theme.secondaryText }]}>
            {t('No bookmarks yet. Open the book and tap ★ on the paragraph you need.')}
          </Text>
        ) : (
          items.map((item) => (
            <TouchableOpacity key={String(item.index)} style={[styles.row, metal(theme, 'raised', { radius: a.radius }), { borderBottomWidth: 0 }]} onPress={() => open(item.index)}>
              <Icon name="bookmark-filled" size={18} color={theme.primaryText} />
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
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function makeStyles(a: ReturnType<typeof useAdaptive>) {
  return StyleSheet.create({
    title: { fontSize: a.title, fontFamily: FONTS.bold, marginBottom: 12, paddingLeft: a.fab() },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: a.tiny ? 9 : 12, borderBottomWidth: 0.5, gap: 8 },
    snippet: { fontSize: a.body, lineHeight: a.body * 1.4 },
    trans: { fontSize: a.small_fs, fontStyle: 'italic', marginTop: 2 },
    empty: { textAlign: 'center', marginTop: 40, fontSize: a.body },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
}
