// components/OpenModeModal.tsx
// Попап при открытии книги: выбор режима чтения. Адаптивный: влезает в любой экран, скроллится.
import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/constants';
import { useAdaptive } from '../theme/useAdaptive';
import Icon from './Icon';
import { neuRaised, neuInset, neuCircle, neuShadowPad } from '../theme/neu';
import { useT } from '../i18n';

type Mode = 'read' | 'dual' | 'speed';

interface Props {
  visible: boolean;
  title: string;
  onSelect: (mode: Mode) => void;
  onClose: () => void;
}

const OPTIONS: { mode: Mode; label: string; desc: string; icon: any }[] = [
  { mode: 'read', label: "Normal", desc: "Original text only", icon: 'book' },
  { mode: 'dual', label: "With translation", desc: "Original + translation under the line", icon: 'language' },
  { mode: 'speed', label: "Speed reading", desc: "Fast word-by-word reading (RSVP)", icon: 'bolt' },
];

export default function OpenModeModal({ visible, title, onSelect, onClose }: Props) {
  const theme = useTheme();
  const t = useT();
  const a = useAdaptive();
  const m = a.modal();
  const iconBox = a.dim(0.055, 32, 44);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: '#00000080', justifyContent: 'center', alignItems: 'center', padding: m.backdropPad, overflow: 'visible' }}
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
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: a.h2, fontFamily: FONTS.bold, color: theme.primaryText }} numberOfLines={2}>
                {title}
              </Text>
              <Text style={{ fontSize: a.small_fs, color: theme.secondaryText, marginTop: 2 }}>{t("How do you want to open the book?")}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={[neuCircle(theme, a.icon(36)), { padding: 0 }]}>
              <Icon name="close" size={a.icon(20)} color={theme.secondaryText} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ marginTop: a.gap }} contentContainerStyle={{ padding: neuShadowPad(12) }} showsVerticalScrollIndicator={false}>
            {OPTIONS.map((o) => (
              <TouchableOpacity
                key={o.mode}
                style={[
                  neuRaised(theme, 12),
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: a.gap,
                    paddingVertical: Math.max(10, a.pad * 0.7),
                    paddingHorizontal: a.gap,
                    marginBottom: a.tiny ? 6 : 10,
                  },
                ]}
                onPress={() => onSelect(o.mode)}
              >
                <View
                  style={{
                    ...neuInset(theme, iconBox / 2),
                    width: iconBox,
                    height: iconBox,
                    borderRadius: iconBox / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={o.icon} size={a.icon(22)} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: a.body, fontFamily: FONTS.bold, color: theme.primaryText }}>{t(o.label)}</Text>
                  <Text style={{ fontSize: a.fs(12), color: theme.secondaryText, marginTop: 2 }}>{t(o.desc)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
