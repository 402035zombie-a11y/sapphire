// services/monetization.native.ts  (NATIVE version — platform-specific)
// Реальна AdMob монетизація (react-native-google-mobile-ads 15.x API).
// Lazy require: модуль може бути відсутнім у dev-client білді → не падаємо на старті.
import Constants from 'expo-constants';

const REWARDED_ID: string =
  (Constants.expoConfig?.extra?.admob?.rewardedId as string) || '';

let initialized = false;

export const isRealAdUnit = REWARDED_ID.length > 0 && !REWARDED_ID.startsWith('ca-app-pub-3940256099942544');

function getAdsModule(): any | null {
  try {
    return require('react-native-google-mobile-ads');
  } catch {
    return null;
  }
}

export async function initAds(): Promise<void> {
  if (initialized) return;
  const mod = getAdsModule();
  if (!mod) {
    console.warn('[monetization] AdMob module not available in this build (dev-client?), skipping init.');
    return;
  }
  try {
    await mod.MobileAds().initialize();
    initialized = true;
  } catch (e) {
    console.warn('[monetization] AdMob init failed:', e);
  }
}

export async function showSupportAd(): Promise<boolean> {
  if (!isRealAdUnit) return true;
  const mod = getAdsModule();
  if (!mod) return true; // dev: не блокуємо підтримку
  const { RewardedAd, RewardedAdEventType, AdEventType } = mod;
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
        resolve(true);
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
