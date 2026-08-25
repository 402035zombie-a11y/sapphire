// services/donate.ts
// Донат через ЗОВНІШНЮ платіжну сторінку (без Play Billing — підтримка автора, не цифровий товар).
// Посилання задається через EXPO_PUBLIC_DONATE_URL (eas.json env / app.config fallback).
import Constants from 'expo-constants';
import { Platform, Linking } from 'react-native';

export const DONATE_URL: string =
  (Constants.expoConfig?.extra?.donateUrl as string) ||
  'https://nowpayments.io/donation/sapphire-reader'; // placeholder — замінити на реальне посилання

export async function openDonatePage(): Promise<boolean> {
  if (!DONATE_URL) return false;
  try {
    if (Platform.OS === 'web') {
      window.open(DONATE_URL, '_blank', 'noopener');
      return true;
    }
    await Linking.openURL(DONATE_URL);
    return true;
  } catch (e) {
    console.warn('[donate] open failed:', e);
    return false;
  }
}
