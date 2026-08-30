// components/SupportAuthorModal.tsx
// Окно поддержки: показывается при открытии книги (с задержкой, см. ReaderScreen).
// Варианты: посмотреть рекламу, задонатить (убирает рекламу навсегда), или закрыть.
// Чтение не блокируется. Адаптивное окно.
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/constants';
import { useAdaptive } from '../theme/useAdaptive';
import Icon from './Icon';
import { ViewStyle } from 'react-native';
import { neuShadowPad, surface } from '../theme/neu';
import { useT } from '../i18n';
import ModalSheet from './ModalSheet';

export default function SupportAuthorModal({
  visible,
  onSupport,
  onDonate,
  onDismiss,
}: {
  visible: boolean;
  onSupport: () => void;
  onDonate?: () => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const a = useAdaptive();
  const m = a.modal();
  const btnStyle: ViewStyle = {
    width: '100%',
    paddingVertical: Math.max(10, Math.round(13 * a.scale)),
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  };
  const btnText = { color: theme.primaryText, fontFamily: FONTS.bold, fontSize: a.body, textAlign: 'center' as const };
  const subText = { color: theme.secondaryText, fontSize: a.fs(10), marginTop: 2, textAlign: 'center' as const };
  return (
    <ModalSheet
      visible={visible}
      onClose={onDismiss}
      blurBackdrop={true}
      role="raised"
      panelStyle={{
        backgroundColor: theme.surface ?? theme.neu.base,
        maxHeight: m.maxHeight,
        padding: m.padding,
        alignItems: 'center',
      }}
    >
      <ScrollView style={{ maxHeight: m.maxHeight - m.padding * 2, width: '100%' }} contentContainerStyle={{ alignItems: 'center', padding: neuShadowPad(12) }} showsVerticalScrollIndicator={false}>
        {/* На очень низком landscape иконку прячем — экономим вертикаль */}
        {!(a.landscape && a.height < 420) && <Icon name="heart" size={a.fab()} color={theme.primaryText} />}
        <Text style={{ fontSize: a.h2, fontFamily: FONTS.bold, color: theme.primaryText, marginTop: 10, textAlign: 'center' }}>
          {t("Support the author")}
        </Text>
        <Text
          style={{
            fontSize: a.fs(14),
            textAlign: 'center',
            marginTop: 8,
            lineHeight: a.fs(14) * 1.45,
            color: theme.secondaryText,
          }}
        >
          {t("Reading is free forever.")}
        </Text>

        <TouchableOpacity style={[surface(theme, 'raised', { radius: a.radius }), btnStyle]} onPress={onSupport}>
          <Text style={btnText}>{t("Watch an ad")}</Text>
        </TouchableOpacity>
        {onDonate && (
          <TouchableOpacity style={[surface(theme, 'raised', { radius: a.radius }), btnStyle]} onPress={onDonate}>
            <Text style={btnText}>{t("Donate")}</Text>
            <Text style={subText}>{t("Removes ads forever")}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[surface(theme, 'raised', { radius: a.radius }), btnStyle]} onPress={onDismiss}>
          <Text style={btnText}>{t("Not now")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </ModalSheet>
  );
}
