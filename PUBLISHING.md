# BookReader — Publishing & Release Guide

Source of truth for going live: install on device, publish to Google Play, connect ads.

## 0. Prerequisites (create accounts BEFORE building)
- [ ] **Google Play Developer Account** — one-time $25 at play.google.com/console
      (verify current price at signup). Required to publish.
- [ ] **AdMob account** — admob.com (same Google login). Create an **App** → copy **App ID**
      (`ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`). Inside it create two **Ad Units**:
      - Banner: `ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX`
      - Rewarded: `ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX`
- [ ] **Privacy Policy URL** — host PRIVACY_POLICY.md (e.g. GitHub Pages). Required by Play.
- [ ] **Expo EAS** — `npm i -g eas-cli` then `eas login` (free account).
- [ ] **Package name decided** — currently `com.bookreader.app` (set via
      `EXPO_PUBLIC_ANDROID_PACKAGE`). Cannot change after first publish.

## 1. Install on your phone (live testing)
EAS builds APK in the cloud (no Android Studio, no power PC). Android builds are FREE.

```bash
npm install -g eas-cli
eas login
eas build:configure          # already done — creates eas.json

# Dev build: hot-reload from Metro, needs native module (AdMob) -> use THIS for full test
eas build --profile development --platform android

# OR Preview build: production JS, just install & tap (simpler for tapping around)
eas build --profile preview --platform android
```
After build, EAS gives an APK link. Download on phone → allow "Install unknown apps"
(Settings → Security) → install. For dev build, later run `npx expo start --dev-client` and
scan the QR inside the installed dev client.

> Expo Go will NOT work — the app uses a native module (AdMob). Use dev/preview build.

## 2. Production build (AAB for Play)
```bash
# Set REAL AdMob IDs as env (no hardcode in repo):
export EXPO_PUBLIC_ADMOB_APP_ID=ca-app-pub-XXXX~YYYY
export EXPO_PUBLIC_ADMOB_BANNER_ID=ca-app-pub-XXXX/YYYY
export EXPO_PUBLIC_ADMOB_REWARDED_ID=ca-app-pub-XXXX/YYYY

eas build --profile production --platform android
```
Output: `.aab` (Android App Bundle) — the format Play requires.

## 3. Upload to Play
```bash
eas submit --platform android        # auto-uploads to Play Console (link account once)
```
OR manually: Play Console → Create app → upload the .aab → Internal testing track.

### Fill in Play Console (mandatory)
- **App signing**: use Play App Signing (Google keeps release key; EAS keeps upload key).
- **Target API level**: Expo SDK54 sets a recent target; if Play complains, bump SDK & rebuild.
- **Content rating**: fill the questionnaire.
- **Data safety**: declare "Advertising ID" + "Data shared with third parties (ad network)".
- **Ads**: mark that the app contains ads.
- **Privacy policy**: paste the URL from step 0.
- **Store listing**: icon (auto from assets/icon.png), screenshots (phone + tablet), description.

## 4. Connect ads — test vs real
- **Dev / Preview**: code uses **test IDs** by default → safe, no ban risk.
- **Production**: set the 3 env vars above with REAL IDs → real ads serve after publish.
- Switching is purely env-based; no code edits between builds.
- Banner is rendered in LibraryScreen; rewarded plays from "Support the author" modal.

## 5. Monetization decision (recommendation)
Keep support as an **external donation link** (Stripe/Polar) inside SupportAuthorModal,
NOT Google Play Billing. Reason: all reading is free, it is a donation, not a digital good,
and external links avoid Google's 15% cut. (Play Billing is only required for in-app
digital products.) Wire the link in `onDonate` in ReaderScreen.

## 6. Known limitations (v1)
- PDF: viewable only in the **web** build (device shows a "open in external app" notice).
  Native PDF needs `react-native-pdf` + `react-native-blob-util` — future version.
- iOS not configured here (bundleIdentifier placeholder only). iOS publishing is a separate
  track (needs Mac for some steps + $99 Apple Dev + App Tracking Transparency consent).

## 7. Quality gate before publish
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npx expo export --platform web` succeeds (web sanity)
- [ ] Dev build installed on phone, AdMob banner visible, rewarded ad plays on "Support"
- [ ] No hardcoded secrets in repo (grep for apiKey/secret/token)
- [ ] Privacy policy URL live; package name final
