// components/SupportAuthorModal.tsx
// Окно поддержки: показывается при открытии книги (с задержкой, см. ReaderScreen).
// Варианты: посмотреть рекламу, задонатить/купить подписку (окно больше не появляется),
// или закрыть «не сейчас». Чтение не блокируется. Адаптивное окно.
import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/constants';
import { useAdaptive } from '../theme/useAdaptive';
import Icon from './Icon';
import { neuRaised, neuShadowPad } from '../theme/neu';
import { useT } from '../i18n';

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
  const btnStyle = {
    width: '100%',
    paddingVertical: Math.max(10, Math.round(13 * a.scale)),
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  };
  const btnText = { color: theme.primaryText, fontFamily: FONTS.bold, fontSize: a.body };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'center', alignItems: 'center', padding: m.backdropPad }}
        activeOpacity={1}
        onPress={onDismiss}
      >
        <View
          onStartShouldSetResponder={() => true}
          style={[
            neuRaised(theme, a.radius + 4),
            {
              width: '100%',
              maxWidth: Math.min(m.maxWidth, 380),
              maxHeight: m.maxHeight,
              padding: m.padding,
              alignItems: 'center',
              overflow: 'visible',
            },
          ]}
        >
          <ScrollView contentContainerStyle={{ alignItems: 'center', padding: neuShadowPad(12) }} showsVerticalScrollIndicator={false}>
            {/* На очень низком landscape иконку прячем — экономим вертикаль */}
            {!(a.landscape && a.height < 420) && <Icon name="heart" size={a.icon(40)} color={theme.primary} />}
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
              {t("Reading is free and always will be — this is the price of a free app. Support the project in any way that suits you.")}
            </Text>

            <TouchableOpacity
              style={[neuRaised(theme, a.radius), btnStyle]}
              onPress={onSupport}
            >
              <Text style={btnText}>{t("Watch an ad (30s)")}</Text>
            </TouchableOpacity>

            {onDonate && (
              <TouchableOpacity style={[neuRaised(theme, a.radius), btnStyle]} onPress={onDonate}>
                <Text style={btnText}>{t("Buy a subscription / Donate")}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[neuRaised(theme, a.radius), btnStyle]} onPress={onDismiss}>
              <Text style={btnText}>{t("Thanks, not now")}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
