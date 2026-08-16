// components/WordActionSheet.tsx
// Попап действий по слову в ОБЫЧНОМ режиме чтения (mode='read'). Адаптивный.
// Единый паттерн: ModalSheet = единственная панель, контент без metal-обёртки.
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/constants';
import { useAdaptive } from '../theme/useAdaptive';
import Icon from './Icon';
import { metal, neuShadowPad } from '../theme/neu';
import { useT } from '../i18n';
import ModalSheet from './ModalSheet';

interface Props {
  visible: boolean;
  word: string;
  sentence: string;
  onSpeakFromHere: (sentence: string) => void;
  onAddToDictionary: (word: string, sentence: string) => void;
  onClose: () => void;
}

export default function WordActionSheet({ visible, word, sentence, onSpeakFromHere, onAddToDictionary, onClose }: Props) {
  const theme = useTheme();
  const t = useT();
  const a = useAdaptive();

  const itemStyle = [
    metal(theme, 'raised', { radius: 12 }),
    {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: a.gap,
      paddingVertical: Math.max(10, a.pad * 0.7),
      paddingHorizontal: a.gap,
      marginBottom: a.tiny ? 6 : 10,
    },
  ];

  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <View style={{ width: '100%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontSize: a.title, fontFamily: FONTS.bold, color: theme.primaryText, flexShrink: 1 }} numberOfLines={2}>
            {word}
          </Text>
          <TouchableOpacity onPress={() => { onSpeakFromHere(sentence); }} hitSlop={10} style={[metal(theme, 'inset', { radius: 10 }), { width: a.icon(34), height: a.icon(34), borderRadius: a.radius, alignItems: 'center', justifyContent: 'center', padding: 0 }]}>
            <Icon name="play" size={a.icon(18)} color={theme.primaryText} />
            </TouchableOpacity>
          <TouchableOpacity onPress={onClose} hitSlop={10} style={[metal(theme, 'stamp', { size: a.icon(34) }), { padding: 0 }]}>
            <Icon name="close" size={a.icon(20)} color={theme.primaryText} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ marginTop: a.gap * 0.5 }} contentContainerStyle={{ padding: neuShadowPad(12) }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={itemStyle}
            onPress={() => {
              onAddToDictionary(word, sentence);
              onClose();
            }}
          >
            <Icon name="bookmark" size={a.icon(20)} color={theme.primary} />
            <Text style={{ fontSize: a.body, fontFamily: FONTS.bold, color: theme.primaryText, flex: 1 }}>
              {t("Add word to dictionary")}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </ModalSheet>
  );
}
