import { Platform } from 'react-native';

export const COLORS = {
  background: '#EEF0F2',
  surface: '#E3E6EA',
  primary: '#2F6FED',
  primaryText: '#1A1A1A',
  secondaryText: '#5B626B',
  border: '#D5D9DE',
  selected: '#EAF1FF',
  success: '#16A34A',
  danger: '#DC2626',
  // тёмная тема (используется когда userInterfaceStyle = dark через ThemeContext позже)
  darkBackground: '#0F1115',
  darkSurface: '#1A1D23',
  darkPrimaryText: '#E5E7EB',
  darkSecondaryText: '#9CA3AF',
};

export const FONTS = {
  // в Expo по умолчанию доступен системный шрифт; кастомные подключаются через expo-font позже
  regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'normal' }),
  bold: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'bold' }),
};

export const SIZES = {
  radius: 12,
  padding: 16,
  gap: 12,
  headerHeight: 56,
};

export const SPACING = SIZES.padding;
