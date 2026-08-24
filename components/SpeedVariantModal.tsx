// components/SpeedVariantModal.tsx
// Модальне вікно вибору варіанта скорочитання: RSVP (Класичний) або Ticker (Рядок, що біжить)
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/constants';
import { useAdaptive } from '../theme/useAdaptive';
import Icon from './Icon';
import { metal } from '../theme/neu';
import ModalSheet from './ModalSheet';
import { useT } from '../i18n';

type Variant = 'rsvp' | 'ticker';

interface Props {
  visible: boolean;
  title: string;
  onSelect: (variant: Variant) => void;
  onClose: () => void;
}

const VARIANTS: { variant: Variant; label: string; desc: string; icon: any }[] = [
  { variant: 'rsvp', label: 'Classic speed reading', desc: 'One word at a time in the center (RSVP)', icon: 'bolt' },
  { variant: 'ticker', label: 'Ticker line', desc: 'Text scrolls along a line at the same speed', icon: 'arrow-forward' },
];

export default function SpeedVariantModal({ visible, title, onSelect, onClose }: Props) {
  const theme = useTheme();
  const t = useT();
  const a = useAdaptive();
  const iconBox = a.dim(0.055, 32, 44);

  return (
    <ModalSheet visible={visible} onClose={onClose} panelStyle={{ ...metal(theme, 'raised', { radius: a.radius + 4, strength: 0.85 }) }}>
      <View onStartShouldSetResponder={() => true} style={{ width: '100%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: a.h2, fontFamily: FONTS.bold, color: theme.primaryText }} numberOfLines={2}>
              {title}
            </Text>
            <Text style={{ fontSize: a.small_fs, color: theme.secondaryText, marginTop: 2 }}>
              {t('Choose a speed reading mode')}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={10} style={[metal(theme, 'circle', { size: a.fab() }), { padding: 0 }]}>
            <Icon name="close" size={a.icon(20)} color={theme.secondaryText} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ marginTop: a.gap, overflow: 'visible' }} contentContainerStyle={{ paddingHorizontal: 6, paddingVertical: 8 }} showsVerticalScrollIndicator={false}>
          {VARIANTS.map((o) => (
            <TouchableOpacity
              key={o.variant}
              style={[
                metal(theme, 'raised', { radius: 12, strength: 0.8 }),
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: a.gap,
                  paddingVertical: Math.max(10, a.pad * 0.7),
                  paddingHorizontal: a.gap,
                  marginBottom: a.tiny ? 8 : 12,
                  marginHorizontal: 2,
                },
              ]}
              onPress={() => {
                onSelect(o.variant);
                onClose();
              }}
            >
              <View
                style={{
                  ...metal(theme, 'inset', { radius: iconBox / 2, strength: 1.0 }),
                  width: iconBox,
                  height: iconBox,
                  borderRadius: iconBox / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={o.icon} size={a.icon(22)} color={theme.primaryText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: a.body, fontFamily: FONTS.bold, color: theme.primaryText }}>{t(o.label)}</Text>
                <Text style={{ fontSize: a.fs(12), color: theme.secondaryText, marginTop: 2 }}>{t(o.desc)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ModalSheet>
  );
}
