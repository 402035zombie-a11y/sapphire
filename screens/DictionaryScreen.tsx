// screens/DictionaryScreen.tsx
// Локальный словарь: список сохранённых слов, поиск, удаление, экспорт.
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { COLORS, SIZES, FONTS } from '../theme/constants';
import { useDictionaryStore } from '../store/dictionaryStore';
import { DictionaryEntry } from '../store/dictionaryStore';
import { langName } from '../utils/languages';

export default function DictionaryScreen() {
  const entries = useDictionaryStore((s) => s.entries);
  const removeEntry = useDictionaryStore((s) => s.removeEntry);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e: DictionaryEntry) => e.word.toLowerCase().includes(q) || e.translation.toLowerCase().includes(q),
    );
  }, [entries, query]);

  const exportAll = async () => {
    if (entries.length === 0) {
      Alert.alert('Пусто', 'Нет слов для экспорта.');
      return;
    }
    const json = JSON.stringify(entries, null, 2);
    const path = FileSystem.documentDirectory + 'dictionary_export.json';
    await FileSystem.writeAsStringAsync(path, json);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path);
    } else {
      Alert.alert('Экспорт', 'Файл сохранён: ' + path);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TextInput
          style={styles.search}
          placeholder="Поиск по слову или переводу…"
          placeholderTextColor={COLORS.secondaryText}
          value={query}
          onChangeText={setQuery}
        />
        <TouchableOpacity style={styles.exportBtn} onPress={exportAll}>
          <Text style={styles.exportText}>Экспорт</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {entries.length === 0
              ? 'Словарь пуст. Кликай по словам при чтении, чтобы сохранять их.'
              : 'Ничего не найдено.'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.word}>
                {item.surfaceForm} <Text style={styles.lang}>{langName(item.lang)}</Text>
              </Text>
              <Text style={styles.translation}>{item.translation}</Text>
              {item.context ? <Text style={styles.context}>«{item.context}»</Text> : null}
            </View>
            <TouchableOpacity onPress={() => removeEntry(item.id)} hitSlop={10}>
              <Text style={styles.delete}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SIZES.padding },
  toolbar: { flexDirection: 'row', gap: 8, marginBottom: SIZES.gap },
  search: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.primaryText,
  },
  exportBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  exportText: { color: '#fff', fontFamily: FONTS.bold },
  list: { paddingBottom: 24 },
  empty: { color: COLORS.secondaryText, textAlign: 'center', marginTop: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.gap,
  },
  word: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.primaryText },
  lang: { fontSize: 12, color: COLORS.secondaryText, fontFamily: FONTS.regular },
  translation: { fontSize: 15, color: COLORS.primary, marginTop: 2 },
  context: { fontSize: 13, color: COLORS.secondaryText, marginTop: 6, fontStyle: 'italic' },
  delete: { color: COLORS.danger, fontSize: 18, paddingHorizontal: 8 },
});
