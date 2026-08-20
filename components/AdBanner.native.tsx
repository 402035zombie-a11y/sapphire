// components/AdBanner.native.tsx  (NATIVE version — platform-specific)
// Реальний AdMob банер (react-native-google-mobile-ads 15.x API).
// Lazy require: модуль може бути відсутнім у dev-client білді → не падаємо на старті.
import React, { useState, useEffect } from 'react';
import { View, Platform } from 'react-native';
import Constants from 'expo-constants';

const BANNER_ID: string =
  (Constants.expoConfig?.extra?.admob?.bannerId as string) || '';

function getAdsModule(): any | null {
  try {
    return require('react-native-google-mobile-ads');
  } catch {
    return null;
  }
}

export default function AdBanner() {
  if (Platform.OS === 'web') return <View />;
  if (!BANNER_ID) return <View />;
  const [error, setError] = useState(false);
  const [Ads, setAds] = useState<any>(null);

  useEffect(() => {
    const mod = getAdsModule();
    if (!mod) {
      setError(true);
      return;
    }
    setAds(mod);
  }, []);

  if (error || !Ads) return <View />;
  const { BannerAd, BannerAdSize } = Ads;
  return (
    <View style={{ width: '100%', alignItems: 'center', paddingVertical: 4 }}>
      <BannerAd
        unitId={BANNER_ID}
        size={BannerAdSize.BANNER}
        onAdFailedToLoad={() => setError(true)}
      />
    </View>
  );
}
