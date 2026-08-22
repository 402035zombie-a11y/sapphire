// components/LanguageDropdown.tsx
// Выпадающий список выбора языка перевода (dropdown под кнопкой, без Modal/затемнения).
// Неоморфизм. Закрывается по выбору или клику вне (через onClose из родителя).
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { useT } from '../i18n';
import { metal, neuShadowPad, screenBg, metalText } from '../theme/neu';
import { LANGUAGES, LangOption } from '../utils/languages';
import Icon from './Icon';

interface Props {
  value: string;
  onSelect: (code: string) => void;
  onClose: () => void;
  /** true для выбора языка ПЕРЕВОДА — исключает 'ru' (русский только для чтения). */
  excludeRu?: boolean;
}

export default function LanguageDropdown({ value, onSelect, onClose, excludeRu }: Props) {
  const [query, setQuery] = useState('');
  const theme = useTheme();
  const a = useAdaptive();
  const t = useT();

  const list: LangOption[] = (() => {
    const q = query.trim().toLowerCase();
    let src = LANGUAGES;
    if (excludeRu) src = src.filter((l) => l.code !== 'ru');
    if (!q) return src;
    return src.filter(
      (l) => l.name.toLowerCase().includes(q) || l.en.toLowerCase().includes(q) || l.code.includes(q),
    );
  })();

  return (
    <View
      style={[
        metal(theme, 'raised', { radius: a.radius + 4 }),
        {
          position: 'absolute',
          top: a.dim(0.038, 20, 28) + a.pad,
          right: 0,
          width: Math.min(260, a.width - a.pad * 2),
          maxHeight: a.height * 0.5,
          padding: a.tiny ? 6 : 10,
          borderRadius: a.radius + 4,
          zIndex: 100,
        },
      ]}
    >
      <TextInput
        style={[
          metal(theme, 'inset', { radius: a.radius }),
          {
            paddingHorizontal: 10,
            paddingVertical: a.tiny ? 6 : 8,
            fontSize: a.small_fs,
            color: theme.primaryText,
            marginBottom: a.tiny ? 6 : 8,
          },
        ]}
        placeholder={t('Search language…')}
        placeholderTextColor={theme.secondaryText}
        value={query}
        onChangeText={setQuery}
        autoFocus
      />
      <FlatList
        data={list}
        keyExtractor={(l) => l.code}
        style={{ maxHeight: a.height * 0.4 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: a.tiny ? 7 : 9,
                paddingHorizontal: 8,
                borderRadius: 8,
                backgroundColor: item.code === value ? theme.selected : 'transparent',
              },
            ]}
            onPress={() => {
              onSelect(item.code);
              onClose();
            }}
          >
            <Text
              style={{
                color: item.code === value ? theme.primary : theme.primaryText,
                fontFamily: item.code === value ? 'System' : undefined,
                fontSize: a.small_fs,
                flex: 1,
              } as any}
            >
              {item.name}
            </Text>
            {item.code === value && <Text style={{ color: theme.primary, fontSize: a.small_fs }}>✓</Text>}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
