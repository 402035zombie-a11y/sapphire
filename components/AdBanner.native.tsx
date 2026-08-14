// components/AdBanner.native.tsx  (NATIVE version — platform-specific)
// Реальний AdMob банер (react-native-google-mobile-ads 15.x API).
import React, { useState, useEffect } from 'react';
import { View, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';

const BANNER_ID: string =
  (Constants.expoConfig?.extra?.admob?.bannerId as string) ||
  'ca-app-pub-5113967448800652/4712038644';

export default function AdBanner() {
  // На вебі пакет недоступний — повертаємо порожній View.
  if (Platform.OS === 'web') return <View />;
  const [error, setError] = useState(false);
  useEffect(() => {
    // AdMob ініціалізується в App.tsx initAds(); тут лише рендер банера.
  }, []);
  if (error) return <View />;
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
