// components/LanguagePicker.tsx
// Попап выбора языка: «Auto-detect» + поиск. Адаптивный bottom-sheet
// (на широких экранах — центрированная карточка ограниченной ширины). Неоморфизм.
import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, Pressable } from 'react-native';
const { BottomSheetModal, BottomSheetBackdrop } = require('@gorhom/bottom-sheet');
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { useT } from '../i18n';
import { neuRaised, neuInset, neuCircle } from '../theme/neu';
import { LANGUAGES, LangOption } from '../utils/languages';
import Icon from './Icon';

interface Props {
  visible: boolean;
  value: string;
  onSelect: (code: string) => void;
  onClose: () => void;
  allowAuto?: boolean;
  exclude?: string[]; // коды для исключения (напр. ['ru'])
  options?: LangOption[]; // кастомный список (переопределяет LANGUAGES)
}

export default function LanguagePicker({ visible, value, onSelect, onClose, allowAuto = true, exclude, options }: Props) {
  const [query, setQuery] = useState('');
  const theme = useTheme();
  const a = useAdaptive();
  const t = useT();

  const list: LangOption[] = useMemo(() => {
    let base = options ?? (allowAuto ? LANGUAGES : LANGUAGES.filter((l) => l.code !== 'auto'));
    if (!options && exclude && exclude.length) base = base.filter((l) => !exclude.includes(l.code));
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((l) => l.name.toLowerCase().includes(q) || l.en.toLowerCase().includes(q) || l.code.includes(q));
  }, [query, allowAuto, exclude, options]);

  const centered = a.width >= 768;
  const sheetMaxH = a.height * (a.landscape ? 0.9 : 0.75);

  const ref = React.useRef<any>(null);
  React.useEffect(() => {
    const m = ref.current;
    if (!m) return;
    if (visible) m.present();
    else m.dismiss();
  }, [visible]);

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={[centered ? '70%' : '80%']}
      backdropComponent={(props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      )}
      onDismiss={onClose}
    >
      <Pressable
        style={[
          neuRaised(theme, a.radius + 6),
          {
            width: centered ? Math.min(a.width - a.pad * 2, 520) : undefined,
            maxHeight: sheetMaxH,
            padding: a.pad,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: a.gap }}>
            <Text style={{ fontSize: a.h2, fontFamily: 'System', fontWeight: '700', color: theme.primaryText }}>{t('Choose language')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={[neuCircle(theme, a.icon(36)), { padding: 0 }]}>
              <Icon name="close" size={a.icon(20)} color={theme.secondaryText} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={[
              neuInset(theme, a.radius),
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
          <FlatList
            data={list}
            keyExtractor={(l) => l.code}
            style={{ maxHeight: sheetMaxH - a.headerH * 2 - a.pad * 2 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
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
            )}
          />
        </Pressable>
    </BottomSheetModal>
  );
}

