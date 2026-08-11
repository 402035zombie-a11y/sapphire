// components/WordActionSheet.tsx
// Попап действий по слову в ОБЫЧНОМ режиме чтения (mode='read'). Адаптивный.
import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/constants';
import { useAdaptive } from '../theme/useAdaptive';
import Icon from './Icon';
import { neuRaised, neuInset, neuCircle, neuShadowPad } from '../theme/neu';
import { useT } from '../i18n';

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
  const m = a.modal();
  if (!visible) return null;

  const itemStyle = [
    neuRaised(theme, 12),
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'center', alignItems: 'center', padding: m.backdropPad }}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          onStartShouldSetResponder={() => true}
          style={[
            neuRaised(theme, m.borderRadius),
            {
              width: m.width,
              maxWidth: m.maxWidth,
              maxHeight: m.maxHeight,
              padding: m.padding,
              overflow: 'visible',
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ fontSize: a.title, fontFamily: FONTS.bold, color: theme.primaryText, flexShrink: 1 }} numberOfLines={2}>
              {word}
            </Text>
            <TouchableOpacity onPress={() => { onSpeakFromHere(sentence); }} hitSlop={10} style={[neuInset(theme, 10), { width: a.icon(34), height: a.icon(34), borderRadius: a.radius, alignItems: 'center', justifyContent: 'center', padding: 0 }]}>
              <Icon name="play" size={a.icon(18)} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={[neuCircle(theme, a.icon(34)), { padding: 0 }]}>
              <Icon name="close" size={a.icon(20)} color={theme.secondaryText} />
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
      </TouchableOpacity>
    </Modal>
  );
}
