// components/SupportButton.tsx
// Небольшая неоморфная кнопка «Поддержать» (сердечко), доступная на каждом экране.
// Открывает окно SupportAuthorModal с предложением посмотреть рекламу.
// Премиума нет — приложение бесплатно навсегда, поддержка добровольная.
import React from 'react';
import { TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import Icon from './Icon';
import { surface } from '../theme/neu';
import SupportAuthorModal from './SupportAuthorModal';
import { useSupportStore } from '../store/supportStore';
import { openDonatePage } from '../services/donate';
import { useT } from '../i18n';

export default function SupportButton({
  size,
  iconSize,
  variant = 'circle',
}: {
  size?: number;
  iconSize?: number;
  variant?: 'circle' | 'stamp' | 'inset';
}) {
  const theme = useTheme();
  const t = useT();
  const a = useAdaptive();
  const btnSize = size ?? a.fab();
  const icSize = iconSize ?? Math.round(a.fab() * 0.5);
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <TouchableOpacity
        style={[surface(theme, variant, { size: btnSize }), { padding: 0 }]}
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityLabel={t("Support the author")}
      >
        <Icon name="heart" size={icSize} color={theme.primaryText} />
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
            openDonatePage();
          }}
          onDismiss={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
