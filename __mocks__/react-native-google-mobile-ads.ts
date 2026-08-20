// __mocks__/react-native-google-mobile-ads.ts
// Dev-only заглушка: у dev-client білді нативний RNGoogleMobileAdsModule відсутній,
// тому статичний require падає на старті. Цей mock дозволяє запустити апку без AdMob.
// Продакшн-білд EAS використовує свій Metro (без цього alias) → реальна реклама працює.
export const MobileAds = {
  async initialize() {
    console.warn('[mock-admob] MobileAds.initialize skipped (dev)');
    return { adapterStatuses: [] };
  },
};
export const BannerAd = ({ unitId, size, onAdFailedToLoad }: any) => {
  // повертаємо порожній View через react-native
  const React = require('react');
  const { View } = require('react-native');
  return React.createElement(View, { style: { height: 0 } });
};
export const BannerAdSize = { BANNER: 'BANNER', ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' };
export const RewardedAd = {
  createForAdRequest: () => ({
    addAdEventListener: () => () => {},
    load: () => {},
    show: () => {},
  }),
};
export const RewardedAdEventType = { LOADED: 'loaded', EARNED_REWARD: 'earned_reward' };
export const AdEventType = { CLOSED: 'closed', ERROR: 'error' };
export const TestIds = {
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
  NATIVE: 'ca-app-pub-3940256099942544/2247696110',
};
