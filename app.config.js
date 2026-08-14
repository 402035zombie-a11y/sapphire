// app.config.js — единая точка правды конфигурации сборки.
// Все секреты/ключи берутся из ENV, НЕ хардкодятся в репо.

const PACKAGE = process.env.EXPO_PUBLIC_ANDROID_PACKAGE || 'com.bookreader.app';
const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME || 'BookReader';

const ADMOB_APP_ID = process.env.EXPO_PUBLIC_ADMOB_APP_ID || 'ca-app-pub-5113967448800652~8371247908';
const ADMOB_BANNER_ID = process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || 'ca-app-pub-5113967448800652/4712038644';
const ADMOB_REWARDED_ID = process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID || 'ca-app-pub-5113967448800652/4712038644';

const IS_PRODUCTION = process.env.EAS_BUILD_PROFILE === 'production';

module.exports = ({ config }) => ({
  ...config,
  name: APP_NAME,
  slug: 'bookreader',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  scheme: 'bookreader',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#1A1D22',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.bookreader.app',
    // Для AdMob на iOS нужен Info.plist ключ (требование App Tracking Transparency).
    // Здесь только базовый каркас; iOS-публикация — отдельная задача.
    infoPlist: {
      SKAdNetworkItems: [{ SKAdNetworkIdentifier: 'cstr6suwn9.skadnetwork' }],
    },
  },
  android: {
    package: PACKAGE,
    versionCode: 1,
    // Удалены устаревшие READ/WRITE_EXTERNAL_STORAGE — на свежем SDK/Android
    // они либо не нужны, либо требуют scoped-permissions и сломают рецензию.
    permissions: [],
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1A1D22',
    },
    softwareKeyboardLayoutMode: 'pan',
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    [
      'expo-build-properties',
      {
        android: {
          // Kotlin версію НЕ фіксуємо — Expo SDK54 ставить дефолтну 2.1.0.
          // Примусовий 2.3.0 конфліктував з AdMob 15.x (play-services-ads 24.3.0, Kotlin 2.1.0).
        },
      },
    ],
    [
      'expo-document-picker',
      {
        // минимально нужные MIME для выбора книг
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: ADMOB_APP_ID,
        iosAppId: ADMOB_APP_ID,
        delayAppMeasurementInit: !IS_PRODUCTION,
      },
    ],
  ],
  extra: {
    admob: {
      appId: ADMOB_APP_ID,
      bannerId: ADMOB_BANNER_ID,
      rewardedId: ADMOB_REWARDED_ID,
    },
    eas: {
      projectId: process.env.EAS_PROJECT_ID || '59123992-8765-4762-87a4-9449c7384d79',
    },
  },
});
