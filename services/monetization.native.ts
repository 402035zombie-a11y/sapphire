// services/monetization.native.ts  (NATIVE version — platform-specific)
// Реальная интеграция AdMob для Android/iOS.
// Импорт пакета тут безопасен: этот файл НЕ резолвится в web-сборке.
import Constants from 'expo-constants';

const REWARDED_ID: string =
  (Constants.expoConfig?.extra?.admob?.rewardedId as string) ||
  'ca-app-pub-3940256099942544/5224354917';

export const isRealAdUnit = !REWARDED_ID.startsWith('ca-app-pub-3940256099942544');

export async function initAds(): Promise<void> {
  try {
    const { MobileAds } = await import('react-native-google-mobile-ads');
    await MobileAds().initialize();
  } catch {
    // не блокируем запуск
  }
}

export async function showSupportAd(): Promise<boolean> {
  try {
    const {
      RewardedAd,
      RewardedAdEventType,
      AdEventType,
    } = await import('react-native-google-mobile-ads');
    const ad = RewardedAd.createForAdRequest(REWARDED_ID, {
      requestNonPersonalizedAdsOnly: false,
    });
    return await new Promise<boolean>((resolve) => {
      let done = false;
      const finish = (val: boolean) => {
        if (done) return;
        done = true;
        unsubLoaded();
        unsubEarned();
        unsubClosed();
        resolve(val);
      };
      const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        ad.show();
      });
      const unsubEarned = ad.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => finish(true),
      );
      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () =>
        finish(false),
      );
      ad.load();
    });
  } catch {
    return false;
  }
}
