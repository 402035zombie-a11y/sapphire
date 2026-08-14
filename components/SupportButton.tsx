// components/SupportButton.tsx
// Небольшая неоморфная кнопка «Поддержать» (сердечко), доступная на каждом экране.
// Открывает окно SupportAuthorModal с предложением посмотреть рекламу.
// Премиума нет — приложение бесплатно навсегда, поддержка добровольная.
import React from 'react';
import { TouchableOpacity, Platform, Modal } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import Icon from './Icon';
import { metal, neuShadowPad, screenBg, metalText } from '../theme/neu';
import SupportAuthorModal from './SupportAuthorModal';
import { useSupportStore } from '../store/supportStore';
import { useT } from '../i18n';

export default function SupportButton({ size, iconSize }: { size?: number; iconSize?: number }) {
  const theme = useTheme();
  const t = useT();
  const a = useAdaptive();
  const btnSize = size ?? a.fab();
  const icSize = iconSize ?? Math.round(a.fab() * 0.5);
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <TouchableOpacity
        style={[metal(theme, 'circle', { size: btnSize }), { padding: 0 }]}
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityLabel={t("Support the author")}
      >
        <Icon name="heart" size={icSize} color={theme.primary} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="none" statusBarTranslucent>
        <SupportAuthorModal
          visible={open}
          onSupport={async () => {
            const { showSupportAd } = await import('../services/monetization');
            await showSupportAd();
            setOpen(false);
          }}
          onDonate={() => {
            setOpen(false);
            useSupportStore.getState().setDontShowSupport(true);
            if (Platform.OS === 'web') window.alert(t("Thanks for your support! (donation/subscription is a stub in the web version)"));
          }}
          onDismiss={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
