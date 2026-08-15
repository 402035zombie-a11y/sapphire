// services/monetization.native.ts  (NATIVE version — platform-specific)
// Реальна AdMob монетизація (react-native-google-mobile-ads 15.x API).
import Constants from 'expo-constants';
import { MobileAds, RewardedAd, RewardedAdEventType, TestIds, AdEventType } from 'react-native-google-mobile-ads';

const REWARDED_ID: string =
  (Constants.expoConfig?.extra?.admob?.rewardedId as string) || '';

let initialized = false;

// isRealAdUnit: true якщо ID не порожній і не Google test-ID.
export const isRealAdUnit = REWARDED_ID.length > 0 && !REWARDED_ID.startsWith('ca-app-pub-3940256099942544');

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
  // Без валідного rewarded-ID — не показуємо (вважаємо підтримку отриманою, щоб не блокувати UX).
  if (!isRealAdUnit) return true;
  // Показуємо rewarded-рекламу за підтримку автора.
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
