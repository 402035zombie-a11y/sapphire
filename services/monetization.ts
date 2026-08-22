// services/monetization.ts  (WEB version — platform-specific)
// На web нативный пакет react-native-google-mobile-ads недоступен.
// Здесь только мок: логика вызова не должна импортировать нативный модуль,
// иначе web-сборка падает при резолве нативных spec-компонентов.
import { Platform } from 'react-native';
import { tStatic } from '../i18n';

// Нативная реализация живёт в monetization.native.ts (авто-выбор Metro/Expo).
export async function initAds(): Promise<void> {
  // no-op на web
}

export async function showSupportAd(): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  const ok = window.confirm(tStatic('Support the author: watch an ad ~30s?'));
  return ok;
}

export const isRealAdUnit = false;
