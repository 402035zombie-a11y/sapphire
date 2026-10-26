// plugins/withRemoveSystemAlertWindow.js
// Expo's bare-minimum manifest template ships SYSTEM_ALERT_WINDOW ("OPTIONAL PERMISSIONS,
// REMOVE WHATEVER YOU DO NOT NEED"). Sapphire never draws over other apps, and Google Play
// treats that permission as sensitive (needs a core-feature justification). `android.permissions`
// only ADDS to the template, so the only way to drop it is a config plugin.
const { withAndroidManifest } = require('@expo/config-plugins');

const PERMISSION = 'android.permission.SYSTEM_ALERT_WINDOW';

function strip(manifest) {
  const entry = manifest['uses-permission'];
  if (Array.isArray(entry)) {
    manifest['uses-permission'] = entry.filter((p) => p.$?.['android:name'] !== PERMISSION);
    if (manifest['uses-permission'].length === 0) delete manifest['uses-permission'];
  } else if (entry && entry.$?.['android:name'] === PERMISSION) {
    delete manifest['uses-permission'];
  }
  return manifest;
}

module.exports = function withRemoveSystemAlertWindow(config) {
  return withAndroidManifest(config, (cfg) => {
    cfg.modResults.manifest = strip(cfg.modResults.manifest);
    return cfg;
  });
};
