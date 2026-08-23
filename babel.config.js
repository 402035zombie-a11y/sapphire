module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      // Production: прибирає console.* (тимчасово вимкнено — підозра на конфлікт з тінями)
      // ['transform-remove-console', { exclude: ['error', 'warn'] }],
    ],
  };
};
