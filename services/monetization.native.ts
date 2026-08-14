// services/monetization.native.ts  (NATIVE version — platform-specific)
// Реальна AdMob монетизація (react-native-google-mobile-ads 15.x API).
import Constants from 'expo-constants';
import { MobileAds, RewardedAd, RewardedAdEventType, TestIds, AdEventType } from 'react-native-google-mobile-ads';

const REWARDED_ID: string =
  (Constants.expoConfig?.extra?.admob?.rewardedId as string) ||
  'ca-app-pub-5113967448800652/4712038644';

let initialized = false;

export const isRealAdUnit = !REWARDED_ID.startsWith('ca-app-pub-3940256099942544');

export async function initAds(): Promise<void> {
  if (initialized) return;
  try {
    await MobileAds().initialize();
    initialized = true;
  } catch (e) {
    // AdMob може не ініціалізуватися в dev/emu — не падаємо.
    console.warn('[monetization] AdMob init failed:', e);
  }
}

export async function showSupportAd(): Promise<boolean> {
  // Показуємо rewarded-рекламу за підтримку автора.
  // Якщо реальний unit недоступний (dev), повертаємо true (вважаємо підтримку отриманою).
  try {
    const rewarded = RewardedAd.createForAdRequest(REWARDED_ID, {
      requestNonPersonalizedAdsOnly: true,
    });
    return await new Promise<boolean>((resolve) => {
      const unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        rewarded.show();
      });
      const unsubEarned = rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          cleanup();
          resolve(true);
        }
      );
      const unsubClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        cleanup();
        resolve(false);
      });
      const unsubError = rewarded.addAdEventListener(AdEventType.ERROR, () => {
        cleanup();
        resolve(true); // dev: не блокуємо підтримку при помилці реклами
      });
      function cleanup() {
        unsubLoaded();
        unsubEarned();
        unsubClosed();
        unsubError();
      }
      rewarded.load();
    });
  } catch (e) {
    console.warn('[monetization] showSupportAd failed:', e);
    return true;
  }
}
