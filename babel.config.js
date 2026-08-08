module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      './babel-plugin-no-import-meta.js',
      'react-native-reanimated/plugin',
    ],
  };
};
