// metro.config.js
//
// Два незалежні аліаси — обидва потрібні, не конфліктують:
//
// 1) RN-web проект: окремі модулі (worklets, reanimated) мають web-ентрі,
//    і метро іноді резолвить 'react-native-web' замість нативного 'react-native'
//    у android/ios бандлі -> падає з "View config getter for component 'pre'".
//    Забороняємо підтягувати react-native-web у нативних платформах.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.alias = {
  ...config.resolver.alias,
  'react-native-web': false,
};

// 2) Dev-only: підставляє mock замість react-native-google-mobile-ads, бо dev-client
//    APK (EAS development) не містить нативного RNGoogleMobileAdsModule → статичний
//    require падає на старті. Цей alias діє ТІЛЬКИ для локального Metro (dev),
//    продакшн-білд EAS збирається зі своїм Metro без цього alias → реальна реклама працює.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-google-mobile-ads': path.resolve(__dirname, '__mocks__/react-native-google-mobile-ads.ts'),
};
// гарантуємо, що .ts mock резолвиться
config.resolver.sourceExts = ['ts', 'tsx', 'js', 'jsx', ...config.resolver.sourceExts.filter((e) => e !== 'ts' && e !== 'tsx')];

module.exports = config;
