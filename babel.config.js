// Expo SDK 54 default preset + worklets plugin required by
// react-native-vision-camera v4 frame processors and react-native-worklets-core.
// The worklets plugin MUST be listed last per the docs.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets-core/plugin'],
  };
};
