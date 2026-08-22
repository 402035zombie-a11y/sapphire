const PACKAGE = process.env.EXPO_PUBLIC_ANDROID_PACKAGE || "com.mike.wolfskin";
const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME || "Sapphire";
const ADMOB_APP_ID = "ca-app-pub-5113967448800652~8371247908";
const ADMOB_BANNER_ID = "ca-app-pub-5113967448800652/4712038644";
const ADMOB_REWARDED_ID = "ca-app-pub-5113967448800652/1663349260";
module.exports = {
  name: APP_NAME, slug: "bookreader", version: "1.0.0",
  orientation: "all", userInterfaceStyle: "automatic", newArchEnabled: true, scheme: "bookreader",
  privacyPolicyUrl: "https://raw.githubusercontent.com/402035zombie-a11y/bookreader/fix/ui-bugs/docs/privacy-policy.html",
  icon: "./assets/icon.png",
  splash: { image: "./assets/splash.png", resizeMode: "contain", backgroundColor: "#1A1D22" },
  assetBundlePatterns: ["**/*"],
  ios: { supportsTablet: true, bundleIdentifier: "com.mike.wolfskin", infoPlist: { SKAdNetworkItems: [{ SKAdNetworkIdentifier: "cstr6suwn9.skadnetwork" }] } },
  android: { package: PACKAGE, versionCode: 2, permissions: [], adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#000000" }, softwareKeyboardLayoutMode: "pan" },
  web: { favicon: "./assets/favicon.png", bundler: "metro" },
  plugins: [
    ["expo-build-properties", {
      android: {
        manifest: {
          application: {
            "meta-data": [
              { "name": "com.google.android.gms.ads.APPLICATION_ID", "value": "ca-app-pub-5113967448800652~8371247908" }
            ]
          }
        }
      }
    }],
    ["expo-document-picker", {}],
  ],
  extra: {
    admob: { appId: ADMOB_APP_ID, bannerId: ADMOB_BANNER_ID, rewardedId: ADMOB_REWARDED_ID },
    eas: { projectId: process.env.EAS_PROJECT_ID || "c6014b22-df9e-464c-903c-ffa9a5793249" },
  },
};
