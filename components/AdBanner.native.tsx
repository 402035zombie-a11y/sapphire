// components/AdBanner.native.tsx  (NATIVE version — platform-specific)
// Реальный баннер AdMob. Этот файл НЕ резолвится в web-сборке.
import React from 'react';
import { View } from 'react-native';
import Constants from 'expo-constants';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useAdaptive } from '../theme/useAdaptive';

export default function AdBanner() {
  const a = useAdaptive();
  const bannerId: string =
    (Constants.expoConfig?.extra?.admob?.bannerId as string) ||
    'ca-app-pub-3940256099942544/6300978111';
  return (
    <View style={{ alignItems: 'center', marginHorizontal: a.pad, marginBottom: a.gap }}>
      <BannerAd
        unitId={bannerId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdFailedToLoad={(e: any) => {
          if (__DEV__) console.warn('[AdMob] banner failed:', e?.message);
        }}
      />
    </View>
  );
}
