// theme/ThemeContext.tsx
// Провайдер активной палитры. Читает theme из settingsStore и отдаёт THEMES[mode].
import React, { createContext, useContext } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { THEMES, ThemeMode, ThemePalette } from './themes';

const ThemeContext = createContext<ThemePalette>(THEMES.night);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useSettingsStore((s) => s.theme) as ThemeMode;
  const palette = THEMES[mode] ?? THEMES.night;
  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemePalette {
  return useContext(ThemeContext);
}
