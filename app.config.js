// app.config.js — единая точка правды конфигурации сборки.
// Все секреты/ключи берутся из ENV, НЕ хардкодятся в репо.

const PACKAGE = process.env.EXPO_PUBLIC_ANDROID_PACKAGE || 'com.mike.wolfskin';
const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME || 'BookReader';

// AdMob IDs — з ENV, або hardcoded fallback (згода юзера є у api-keys.txt).
const ADMOB_APP_ID = process.env.EXPO_PUBLIC_ADMOB_APP_ID || 'ca-app-pub-5113967448800652~8371247908';
const ADMOB_BANNER_ID = process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || 'ca-app-pub-5113967448800652/4712038644';
const ADMOB_REWARDED_ID = process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID || 'ca-app-pub-5113967448800652/1663349260';

const IS_PRODUCTION = process.env.EAS_BUILD_PROFILE === 'production';

module.exports = ({ config }) => ({
  ...config,
  name: APP_NAME,
  slug: 'bookreader',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  scheme: 'bookreader',
  privacyPolicyUrl: 'https://raw.githubusercontent.com/402035zombie-a11y/bookreader/fix/ui-bugs/docs/privacy-policy.html',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#1A1D22',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.mike.wolfskin',
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
      projectId: process.env.EAS_PROJECT_ID || 'c6014b22-df9e-464c-903c-ffa9a5793249',
    },
  },
});
