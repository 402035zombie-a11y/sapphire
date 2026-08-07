// components/LanguagePicker.tsx
// Попап выбора языка в стиле Google Translate: «Автоопределение» + поиск по списку.
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Pressable,
} from 'react-native';
import { COLORS, SIZES, FONTS } from '../theme/constants';
import { LANGUAGES, LangOption } from '../utils/languages';

interface Props {
  visible: boolean;
  value: string;
  onSelect: (code: string) => void;
  onClose: () => void;
  allowAuto?: boolean;
}

export default function LanguagePicker({ visible, value, onSelect, onClose, allowAuto = true }: Props) {
  const [query, setQuery] = useState('');

  const list: LangOption[] = useMemo(() => {
    const base = allowAuto ? LANGUAGES : LANGUAGES.filter((l) => l.code !== 'auto');
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((l) => l.name.toLowerCase().includes(q) || l.code.includes(q));
  }, [query, allowAuto]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <Text style={styles.header}>Выберите язык</Text>
          <TextInput
            style={styles.search}
            placeholder="Поиск языка…"
            placeholderTextColor={COLORS.secondaryText}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          <FlatList
            data={list}
            keyExtractor={(l) => l.code}
            style={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.row, item.code === value && styles.rowActive]}
                onPress={() => {
                  onSelect(item.code);
                  onClose();
                }}
              >
                <Text style={[styles.rowText, item.code === value && styles.rowTextActive]}>{item.name}</Text>
                {item.code === value && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    padding: SIZES.padding,
  },
  header: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.primaryText, marginBottom: 12 },
  search: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.primaryText,
    marginBottom: 12,
  },
  list: { maxHeight: 360 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  rowActive: { backgroundColor: COLORS.selected },
  rowText: { fontSize: 15, color: COLORS.primaryText },
  rowTextActive: { fontFamily: FONTS.bold, color: COLORS.primary },
  check: { color: COLORS.primary, fontSize: 16 },
});
