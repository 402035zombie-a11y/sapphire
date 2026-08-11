// screens/SectionsScreen.tsx
// Оглавление книги: список разделов, тап → переход к абзацу в ридере.
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import BackFab from '../components/BackFab';
import Icon from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { useLibraryStore } from '../store/libraryStore';
import { FONTS } from '../theme/constants';
import { useAdaptive } from '../theme/useAdaptive';
import { neuRaised, neuShadowPad, screenBg } from '../theme/neu';
import { useT } from '../i18n';

export default function SectionsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const bookId: string = route.params?.bookId;
  const theme = useTheme();
  const t = useT();
  const a = useAdaptive();
  const styles = React.useMemo(() => makeStyles(a), [a]);
  const book = useLibraryStore((s) => s.books.find((b) => b.id === bookId));

  if (!book) {
    return (
      <View style={[styles.center, { backgroundColor: 'transparent' }]}>
        <Text style={{ color: theme.secondaryText }}>{t('Book not found.')}</Text>
      </View>
    );
  }

  const sections = book.sections ?? [];
  const go = (paragraphIndex: number) => {
    // возвращаемся в ридер и просим прыгнуть к разделу
    navigation.navigate('Reader', { bookId, jumpTo: paragraphIndex });
  };

  // текущий раздел = последний, чей paragraphIndex <= lastPosition
  const curPos = book.lastPosition ?? 0;
  const currentSectionIdx = (() => {
    let idx = -1;
    sections.forEach((s, i) => {
      if (s.paragraphIndex <= curPos) idx = i;
    });
    return idx;
  })();

  return (
    <View style={[styles.container, { ...screenBg(theme) }]}>
      <BackFab onPress={() => navigation.goBack()} />
      <Text style={[styles.title, { color: theme.primaryText }]}>{t('Table of Contents')}</Text>
      <FlatList
        data={sections}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ paddingBottom: 24, padding: neuShadowPad() }}
        ListEmptyComponent={<Text style={{ color: theme.secondaryText }}>{t('No sections.')}</Text>}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={[styles.row, neuRaised(theme, a.radius), { borderBottomWidth: 0, backgroundColor: index === currentSectionIdx ? theme.selected : theme.neu.base }]} onPress={() => go(item.paragraphIndex)}>
            <Text style={[styles.index, { color: theme.secondaryText }]}>{index + 1}</Text>
            <Text style={[styles.name, { color: theme.primaryText }]} numberOfLines={2}>
              {item.title}
            </Text>
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
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: a.tiny ? 10 : 14, borderBottomWidth: 0.5, gap: 12, minHeight: a.hit },
    index: { fontSize: a.fs(14), width: a.icon(24) },
    name: { flex: 1, fontSize: a.body },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
}
