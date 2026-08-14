const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// RN-web проект: окремі модулі (worklets, reanimated) мають web-ентрі,
// і метро іноді резолвить 'react-native-web' замість нативного 'react-native'
// у android/ios бандлі -> падає з "View config getter for component 'pre'".
// Забороняємо підтягувати react-native-web у нативних платформах.
config.resolver.alias = {
  ...config.resolver.alias,
  'react-native-web': false,
};

module.exports = config;
