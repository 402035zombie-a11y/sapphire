// components/TranslationLimitsModal.tsx
// Модалка-сповіщення: усі провайдери перекладу вичерпали ліміти.
// Показує по кожному провайдеру час поновлення ліміту і кнопку «Спробувати знову».
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/constants';
import { useAdaptive } from '../theme/useAdaptive';
import { surface } from '../theme/neu';
import { useT } from '../i18n';
import ModalSheet from './ModalSheet';
import { getProvidersStatus } from '../services/translationProviders';

interface Props {
  visible: boolean;
  onRetry: () => void;
  onClose: () => void;
}

function fmtRemaining(ms: number): string {
  if (ms <= 0) return 'now';
  const min = Math.ceil(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${min % 60} min`;
}

export default function TranslationLimitsModal({ visible, onRetry, onClose }: Props) {
  const theme = useTheme();
  const t = useT();
  const a = useAdaptive();
  const statuses = getProvidersStatus();
  const now = Date.now();

  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <View style={{ width: '100%', gap: a.gap }}>
        <Text style={{ fontSize: a.h2, fontFamily: FONTS.bold, color: theme.primaryText, textAlign: 'center' }}>
          {t('Translation services')}
        </Text>
        <Text style={{ fontSize: a.small_fs, color: theme.secondaryText, textAlign: 'center' }}>
          {t('Free translation services and their current limits. Limits reset automatically.')}
        </Text>

        <View style={{ gap: a.gap * 0.6 }}>
          {statuses.map((p) => {
            const remaining = p.cooldownUntil - now;
            const ok = remaining <= 0;
            return (
              <View
                key={p.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: a.radius,
                  ...surface(theme, 'inset', { radius: a.radius }),
                }}
              >
                <Text style={{ fontSize: a.body, color: theme.primaryText }}>{p.label}</Text>
                <Text
                  style={{
                    fontSize: a.small_fs,
                    fontFamily: FONTS.bold,
                    color: ok ? theme.success : theme.danger ?? theme.secondaryText,
                  }}
                >
                  {ok ? t('Available') : `${t('resets in')} ${fmtRemaining(remaining)}`}
                </Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[surface(theme, 'primary', { radius: a.radius }), { paddingVertical: Math.max(10, Math.round(13 * a.scale)), alignItems: 'center', marginTop: 4 }]}
          onPress={onRetry}
        >
          <Text style={{ color: theme.onPrimary, fontFamily: FONTS.bold, fontSize: a.body }}>
            {t('Try again')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} hitSlop={8} style={{ alignItems: 'center', paddingVertical: 6 }}>
          <Text style={{ color: theme.secondaryText, fontSize: a.small_fs }}>{t('Close')}</Text>
        </TouchableOpacity>
      </View>
    </ModalSheet>
  );
}
