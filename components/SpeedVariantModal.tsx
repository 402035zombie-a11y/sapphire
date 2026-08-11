// components/SpeedVariantModal.tsx
// Попап выбора варианта скорочтения — RSVP или Бегущая строка. Адаптивный.
import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/constants';
import { useAdaptive } from '../theme/useAdaptive';
import Icon from './Icon';
import { neuRaised, neuInset, neuCircle, neuShadowPad } from '../theme/neu';
import { useT } from '../i18n';

export type SpeedVariant = 'rsvp' | 'ticker';

interface Props {
  visible: boolean;
  title: string;
  onSelect: (variant: SpeedVariant) => void;
  onClose: () => void;
}

const OPTIONS: { variant: SpeedVariant; label: string; desc: string; icon: any }[] = [
  { variant: 'rsvp', label: "Classic speed reading", desc: "One word at a time in the center (RSVP)", icon: 'bolt' },
  { variant: 'ticker', label: "Ticker line", desc: "Text scrolls along a line at the same speed", icon: 'arrow-forward' },
];

export default function SpeedVariantModal({ visible, title, onSelect, onClose }: Props) {
  const theme = useTheme();
  const t = useT();
  const a = useAdaptive();
  const m = a.modal();
  const iconBox = a.dim(0.055, 32, 44);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: '#00000080', justifyContent: 'center', alignItems: 'center', padding: m.backdropPad }}
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
              <Text style={{ fontSize: a.small_fs, color: theme.secondaryText, marginTop: 2 }}>{t("Choose a speed reading mode")}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={[neuCircle(theme, a.icon(36)), { padding: 0 }]}>
              <Icon name="close" size={a.icon(20)} color={theme.secondaryText} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ marginTop: a.gap }} contentContainerStyle={{ padding: neuShadowPad(12) }} showsVerticalScrollIndicator={false}>
            {OPTIONS.map((o) => (
              <TouchableOpacity
                key={o.variant}
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
                onPress={() => onSelect(o.variant)}
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
