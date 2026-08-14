// components/AdBanner.native.tsx  (NATIVE version — platform-specific)
// ВРЕМЕННО ЗАГЛУШКА: AdMob вимкнено через Kotlin-конфлікт (SDK54 + play-services-ads 25.4.0).
// Повернути реальний банер після вирішення конфлікту (див. app.config.js + plugins/withPlayServicesAds.js).
import React from 'react';
import { View } from 'react-native';

export default function AdBanner() {
  // Реклама тимчасово вимкнена. Повертаємо порожній View, щоб layout не ламався.
  return <View />;
}
