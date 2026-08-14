// app.config.js — единая точка правды конфигурации сборки.
// Все секреты/ключи берутся из ENV, НЕ хардкодятся в репо.
// Для локальных/CI сборок задай переменные окружения перед `eas build`:
//   EXPO_PUBLIC_ADMOB_APP_ID=ca-app-pub-xxx~yyy
//   EXPO_PUBLIC_ADMOB_BANNER_ID=ca-app-pub-xxx/yyy
//   EXPO_PUBLIC_ADMOB_REWARDED_ID=ca-app-pub-xxx/yyy
//
// Если переменные не заданы — используются ТЕСТОВЫЕ ID AdMob,
// чтобы сборка/дев-билд не падали. В проде ОБЯЗАТЕЛЬНО задай реальные.

const PACKAGE = process.env.EXPO_PUBLIC_ANDROID_PACKAGE || 'com.bookreader.app';
const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME || 'BookReader';

// Тестовые ID AdMob (документация Google). Безопасны для dev/preview.
const TEST_ADMOB_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';

const ADMOB_APP_ID = process.env.EXPO_PUBLIC_ADMOB_APP_ID || TEST_ADMOB_APP_ID;
const ADMOB_BANNER_ID = process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || TEST_BANNER_ID;
const ADMOB_REWARDED_ID = process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID || TEST_REWARDED_ID;

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
      'expo-document-picker',
      {
        // минимально нужные MIME для выбора книг
      },
    ],
    // AdMob временно ВЫКЛЮЧЕН: react-native-google-mobile-ads@16 тянет play-services-ads 25.4.0
    // (Kotlin 2.3.0), несовместимо с Expo SDK54 (Kotlin 2.1.0, нет KSP для 2.3.0).
    // Раскомментировать после решения Kotlin-конфликта (см. plugins/withPlayServicesAds.js).
    // [
    //   'react-native-google-mobile-ads',
    //   {
    //     androidAppId: ADMOB_APP_ID,
    //     iosAppId: ADMOB_APP_ID,
    //     delayAppMeasurementInit: !IS_PRODUCTION,
    //   },
    // ],
  ],
  extra: {
    // admob временно выключен (см. выше).
    // admob: {
    //   appId: ADMOB_APP_ID,
    //   bannerId: ADMOB_BANNER_ID,
    //   rewardedId: ADMOB_REWARDED_ID,
    // },
    eas: {
      projectId: process.env.EAS_PROJECT_ID || '59123992-8765-4762-87a4-9449c7384d79',
    },
  },
  // Экспо отдаёт ENV в клиент только через EXPO_PUBLIC_; оставляем для удобства.
  // (react-native-google-mobile-ads читает appId из нативного конфига выше,
  //  а Ad Unit ID баннера/реварда берём в коде из extra.admob через Constants.)
});
