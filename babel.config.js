module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      // Production: прибирає console.* з бандла (менше ваги, чистий logcat)
      ['transform-remove-console', { exclude: ['error', 'warn'] }],
    ],
  };
};
