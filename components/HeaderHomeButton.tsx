// components/HeaderHomeButton.tsx
// Кнопка «на главное меню» в хедере каждого экрана (стрелка влево).
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import Icon from './Icon';
import { surface, neuShadowPad, screenBg, surfaceText } from '../theme/neu';

export default function HeaderHomeButton({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const a = useAdaptive();
  return (
    <TouchableOpacity
      style={[surface(theme, 'circle', { size: a.icon(38) }), { marginLeft: 14, padding: 0 }]}
      onPress={() => navigation.navigate('Home')}
      hitSlop={10}
    >
      <Icon name="arrow-back" size={a.icon(22)} color={theme.primaryText} />
    </TouchableOpacity>
  );
}
