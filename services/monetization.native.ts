// services/monetization.native.ts  (NATIVE version — platform-specific)
// ВРЕМЕННО ЗАГЛУШКА: AdMob вимкнено через Kotlin-конфлікт (SDK54 + play-services-ads 25.4.0).
// Повернути реальну рекламу після вирішення конфлікту (див. app.config.js + plugins/withPlayServicesAds.js).
import Constants from 'expo-constants';

const REWARDED_ID: string =
  (Constants.expoConfig?.extra?.admob?.rewardedId as string) ||
  'ca-app-pub-3940256099942544/5224354917';

export const isRealAdUnit = !REWARDED_ID.startsWith('ca-app-pub-3940256099942544');

export async function initAds(): Promise<void> {
  // AdMob вимкнено тимчасово.
}

export async function showSupportAd(): Promise<boolean> {
  // Зағлушка: реклама не показується, повертаємо false (користувач не отримав винагороду).
  return false;
}
