// components/OpenModeModal.tsx
// Попап при открытии книги: выбор режима чтения + (для скорочтения) варианта.
// ОДНО окно: режимы и вариант скорочтения выбираются внутри, без второго попапа.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/constants';
import { useAdaptive } from '../theme/useAdaptive';
import Icon from './Icon';
import { metal, neuShadowPad, screenBg, metalText } from '../theme/neu';
import ModalSheet from './ModalSheet';
import { useT } from '../i18n';

type Mode = 'read' | 'dual' | 'speed';
type Variant = 'rsvp' | 'ticker';

interface Props {
  visible: boolean;
  title: string;
  onSelect: (mode: Mode, variant?: Variant) => void;
  onClose: () => void;
}

const MODES: { mode: Mode; label: string; desc: string; icon: any }[] = [
  { mode: 'read', label: 'Normal', desc: 'Original text only', icon: 'book' },
  { mode: 'dual', label: 'With translation', desc: 'Original + translation under the line', icon: 'language' },
  { mode: 'speed', label: 'Speed reading', desc: 'Fast word-by-word reading (RSVP)', icon: 'bolt' },
];

const VARIANTS: { variant: Variant; label: string; desc: string; icon: any }[] = [
  { variant: 'rsvp', label: 'Classic speed reading', desc: 'One word at a time in the center (RSVP)', icon: 'bolt' },
  { variant: 'ticker', label: 'Ticker line', desc: 'Text scrolls along a line at the same speed', icon: 'arrow-forward' },
];

export default function OpenModeModal({ visible, title, onSelect, onClose }: Props) {
  const theme = useTheme();
  const t = useT();
  const a = useAdaptive();
  const m = a.modal();
  const iconBox = a.dim(0.055, 32, 44);
  const [step, setStep] = useState<'mode' | 'speed'>('mode');

  // сброс шага при каждом открытии
  React.useEffect(() => { if (visible) setStep('mode'); }, [visible]);

  const list = step === 'mode' ? MODES : VARIANTS;

  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <View
        onStartShouldSetResponder={() => true}
        style={[{ width: '100%' }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: a.h2, fontFamily: FONTS.bold, color: theme.primaryText }} numberOfLines={2}>
              {title}
            </Text>
            <Text style={{ fontSize: a.small_fs, color: theme.secondaryText, marginTop: 2 }}>
              {step === 'mode' ? t('How do you want to open the book?') : t('Choose a speed reading mode')}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={10} style={[metal(theme, 'stamp', { size: a.fab() }), { padding: 0 }]}>
            <Icon name="close" size={a.icon(20)} color={theme.secondaryText} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ marginTop: a.gap }} contentContainerStyle={{ padding: neuShadowPad(12) }} showsVerticalScrollIndicator={false}>
          {list.map((o) => (
            <TouchableOpacity
              key={step === 'mode' ? (o as any).mode : (o as any).variant}
              style={[
                metal(theme, 'raised', { radius: 12 }),
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: a.gap,
                  paddingVertical: Math.max(10, a.pad * 0.7),
                  paddingHorizontal: a.gap,
                  marginBottom: a.tiny ? 6 : 10,
                },
              ]}
              onPress={() => {
                if (step === 'mode') {
                  const mode = (o as any).mode as Mode;
                  if (mode === 'speed') setStep('speed');
                  else onSelect(mode);
                } else {
                  onSelect('speed', (o as any).variant as Variant);
                }
              }}
            >
              <View
                style={{
                  ...metal(theme, 'inset', { radius: iconBox / 2 }),
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
          {step === 'speed' && (
            <TouchableOpacity
              style={[metal(theme, 'inset', { radius: 12 }), { alignItems: 'center', paddingVertical: Math.max(8, a.pad * 0.5), marginTop: 4 }]}
              onPress={() => setStep('mode')}
            >
              <Text style={{ fontSize: a.body, color: theme.secondaryText }}>{t('Back')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </ModalSheet>
  );
}
