// components/LanguagePicker.tsx
// Попап выбора языка: «Auto-detect» + поиск. Рендерится ВНУТРИ ModalSheet
// (который даёт backdrop+центрирование), поэтому здесь НЕТ собственной обёртки —
// только контент-панель. Список скроллится внутри (flex + ScrollView), чтобы
// модалка вмещалась в любой экран и не сползала.
import ModalSheet from '../components/ModalSheet';
import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { useT } from '../i18n';
import { metal } from '../theme/neu';
import { LANGUAGES, LangOption } from '../utils/languages';
import Icon from './Icon';

interface Props {
  visible: boolean;
  value: string;
  onSelect: (code: string) => void;
  onClose: () => void;
  allowAuto?: boolean;
  exclude?: string[];
  options?: LangOption[];
  // Якщо true — рендерити ТІЛЬКИ контент (без власного ModalSheet),
  // бо батьківська модалка вже дає overlay+панель. Вкладений ModalSheet інакше
  // обрізається батьківським overflow:hidden (T4/T5).
  embedded?: boolean;
}

export default function LanguagePicker({ visible, value, onSelect, onClose, allowAuto = true, exclude, options, embedded = false }: Props) {
  const [query, setQuery] = useState('');
  const theme = useTheme();
  const a = useAdaptive();
  const t = useT();
  const { height: winH } = useWindowDimensions();

  const list: LangOption[] = useMemo(() => {
    let base = options ?? (allowAuto ? LANGUAGES : LANGUAGES.filter((l) => l.code !== 'auto'));
    if (!options && exclude && exclude.length) base = base.filter((l) => !exclude.includes(l.code));
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((l) => l.name.toLowerCase().includes(q) || l.en.toLowerCase().includes(q) || l.code.includes(q));
  }, [query, allowAuto, exclude, options]);

  const content = (
    <View style={{ width: '100%', maxWidth: 360, alignSelf: 'center', maxHeight: Math.round(winH * 0.75), display: 'flex', flexDirection: 'column' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: a.gap }}>
        <Text style={{ fontSize: a.h2, fontFamily: 'System', fontWeight: '700', color: theme.primaryText }}>{t('Choose language')}</Text>
        <TouchableOpacity onPress={onClose} hitSlop={12} style={[metal(theme, 'stamp', { size: a.fab() }), { padding: 0 }]}>
          <Icon name="close" size={a.icon(20)} color={theme.secondaryText} />
        </TouchableOpacity>
      </View>
      <TextInput
        style={[
          metal(theme, 'inset', { radius: a.radius }),
          {
            paddingHorizontal: 12,
            paddingVertical: a.tiny ? 7 : 10,
            fontSize: a.body,
            color: theme.primaryText,
            marginBottom: a.gap,
          },
        ]}
        placeholder={t('Search language…')}
        placeholderTextColor={theme.secondaryText}
        value={query}
        onChangeText={setQuery}
        autoFocus
      />
      <ScrollView
        style={{ maxHeight: Math.round(winH * 0.55) }}
        contentContainerStyle={{ paddingBottom: a.gap }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        {list.map((item) => (
          <TouchableOpacity
            key={item.code}
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: a.tiny ? 9 : 12,
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
                flex: 1,
              } as any}
            >
              {item.name}
            </Text>
            {item.code === value && <Text style={{ color: theme.primary, fontSize: a.body }}>✓</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (embedded) return visible ? content : null;
  return (
    <ModalSheet visible={visible} onClose={onClose} maxHeight="92%">
      {content}
    </ModalSheet>
  );
}
