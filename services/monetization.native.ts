// services/monetization.native.ts  (NATIVE version)
// AdMob rewarded через react-native-google-mobile-ads 15.x.
// Явні помилки замість мовчазного success: timeout, load error → false.

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const REWARDED_ID: string =
  (Constants.expoConfig?.extra?.admob?.rewardedId as string) || '';

let initialized = false;

export const isRealAdUnit = REWARDED_ID.length > 0 && !REWARDED_ID.startsWith('ca-app-pub-3940256099942544');

export function adsUnavailableReason(): string | null {
  if (!REWARDED_ID) return 'AdMob rewarded ID is not configured in this build';
  if (!isRealAdUnit) return 'AdMob rewarded unit is a test ID';
  if (Platform.OS === 'web') return 'Ads are not available on web';
  return null;
}

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

const AD_LOAD_TIMEOUT_MS = 20000;

export async function showSupportAd(): Promise<boolean> {
  const reason = adsUnavailableReason();
  if (reason) {
    console.warn('[monetization] showSupportAd unavailable:', reason);
    return false;
  }

  const mod = getAdsModule();
  if (!mod) {
    console.warn('[monetization] native ads module missing');
    return false;
  }

  await initAds();

  const { RewardedAd, RewardedAdEventType, AdEventType } = mod;
  try {
    const rewarded = RewardedAd.createForAdRequest(REWARDED_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    return await new Promise<boolean>((resolve) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        if (timer) { clearTimeout(timer); timer = null; }
        rewarded.show();
      });
      const unsubEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        finish(true);
      });
      const unsubClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        finish(false);
      });
      const unsubError = rewarded.addAdEventListener(AdEventType.ERROR, (err: unknown) => {
        console.warn('[monetization] ad load/show ERROR:', err);
        finish(false);
      });

      // Якщо реклама не завантажилась за таймаут — не вішати UI назавжди.
      timer = setTimeout(() => {
        console.warn('[monetization] ad load timed out');
        finish(false);
      }, AD_LOAD_TIMEOUT_MS);

      function finish(ok: boolean) {
        if (settled) return;
        settled = true;
        if (timer) { clearTimeout(timer); timer = null; }
        unsubLoaded();
        unsubEarned();
        unsubClosed();
        unsubError();
        resolve(ok);
      }

      rewarded.load();
    });
  } catch (e) {
    console.warn('[monetization] showSupportAd failed:', e);
    return false;
  }
}
