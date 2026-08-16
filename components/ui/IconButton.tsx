// components/ui/IconButton.tsx
// Металлическая кнопка с иконкой. Заменяет дубли
// <TouchableOpacity style={[metal(theme, 'circle'|'inset'|'primary', {size}), ...]}><Icon .../></TouchableOpacity>.
// variant: 'circle' (выпуклая круглая) | 'inset' (вдавленная) | 'primary' (залитая accent).
import React from 'react';
import { TouchableOpacity, ViewStyle } from 'react-native';
import Icon, { IconName } from '../Icon';
import { useTheme } from '../../theme/ThemeContext';
import { useAdaptive } from '../../theme/useAdaptive';
import { metal } from '../../theme/neu';

export default function IconButton({
  icon,
  onPress,
  variant = 'circle',
  size,
  color,
  hitSlop = 8,
  style,
}: {
  icon: IconName;
  onPress: () => void;
  variant?: 'circle' | 'inset' | 'primary';
  size?: number;
  color?: string;
  hitSlop?: number;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const a = useAdaptive();
  const s = size ?? a.fab();
  const role = variant === 'primary' ? 'primary' : variant === 'inset' ? 'inset' : 'circle';
  const iconColor =
    color ?? (variant === 'primary' ? theme.primaryText : theme.primaryText);
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={hitSlop}
      style={[metal(theme, role, { size: s }), { padding: 0 }, style]}
    >
      <Icon name={icon} size={Math.round(s * 0.5)} color={iconColor} />
    </TouchableOpacity>
  );
}
