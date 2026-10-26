# Sapphire — Publishing & Release Guide

Source of truth for going live: install on device, publish to Google Play, connect ads.

## 0. Prerequisites (create accounts BEFORE building)
- [x] **Google Play Developer Account** — one-time $25 at play.google.com/console (verify current price). Required to publish.
- [x] **AdMob account** — admob.com (same Google login). Create an **App** → copy **App ID** (`ca-app-pub-5113967448800652~8371247908`). Inside it create two **Ad Units**:
  - Banner: `ca-app-pub-5113967448800652/4712038644`
  - Rewarded: `ca-app-pub-5113967448800652/1663349260`
- [x] **Privacy Policy URL** — LIVE (2026-10-26): `https://402035zombie-a11y.github.io/sapphire/docs/privacy-policy.html` → **HTTP 200**. Repo `402035zombie-a11y/sapphire` made public + Pages enabled on `main` (root).
- [x] **Expo EAS** — `eas login` (account: **mike4224** / 402035zombie@gmail.com). ⚠️ Проєкт `59123992-…` має slug `bookreader` — перейменувати на `sapphire` в дашборді, інакше **КОЖЕН білд падає** (EAS не резолвить по slug).
- [x] **Package name final** — `com.mike.wolfskin` (set via `EXPO_PUBLIC_ANDROID_PACKAGE`). Cannot change after first publish.

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
After build, EAS gives an APK link. Download on phone → allow "Install unknown apps" (Settings → Security) → install. For dev build, later run `npx expo start --dev-client` and scan the QR inside the installed dev client.

> Expo Go will NOT work — the app uses a native module (AdMob). Use dev/preview build.

## 2. Production build (AAB for Play)
```bash
# REAL AdMob IDs set via EAS environment variables (production profile in eas.json):
# EXPO_PUBLIC_ADMOB_APP_ID=ca-app-pub-5113967448800652~8371247908
# EXPO_PUBLIC_ADMOB_BANNER_ID=ca-app-pub-5113967448800652/4712038644
# EXPO_PUBLIC_ADMOB_REWARDED_ID=ca-app-pub-5113967448800652/1663349260

# EAS_NO_VCS=1 bypasses broken git clone on Windows worktree
EAS_NO_VCS=1 eas build --profile production --platform android
```
Output: `.aab` (Android App Bundle) — the format Play requires.

**Status (2026-10-21):** Build #2 uploaded (ID `7a2b2107-ee51-4436-b41e-db24a0621438`), cloud build running. Build #1 failed at "Install dependencies" — fixed by moving `expo-dev-client` to devDependencies.

## 3. Upload to Play
```bash
eas submit --platform android        # auto-uploads to Play Console (link account once)
```
OR manually: Play Console → Create app → upload the .aab → Internal testing track.

### Fill in Play Console (mandatory)
- **App signing**: use Play App Signing (Google keeps release key; EAS keeps upload key).
- **Target API level**: Expo SDK54 sets a recent target; if Play complains, bump SDK & rebuild.
- **Content rating**: fill the questionnaire. See `docs/content-rating-data-safety.md`.
- **Data safety**: declare "Advertising ID" + "Data shared with third parties (ad network)". See `docs/content-rating-data-safety.md`.
- **Ads**: mark that the app contains ads.
- **Privacy policy**: paste the URL from step 0 (GitHub Pages).
- **Store listing**: icon (auto from assets/icon.png), screenshots (phone + tablet), description.

## 4. Connect ads — test vs real
- **Dev / Preview**: code uses **test IDs** by default → safe, no ban risk.
- **Production**: set the 3 env vars above with REAL IDs → real ads serve after publish.
- Switching is purely env-based; no code edits between builds.
- Banner is rendered in LibraryScreen; rewarded plays from "Support the author" modal.

## 5. Monetization decision (recommendation)
Keep support as an **external donation link** (NOWPayments) inside SupportAuthorModal, NOT Google Play Billing. Reason: all reading is free, it is a donation, not a digital good, and external links avoid Google's 15% cut. (Play Billing is only required for in-app digital products.) Wire the link in `onDonate` in ReaderScreen.

## 6. Known limitations (v1)
- PDF: viewable only in the **web** build (device shows a "open in external app" notice). Native PDF needs `react-native-pdf` + `react-native-blob-util` — future version.
- iOS not configured here (bundleIdentifier placeholder only). iOS publishing is a separate track (needs Mac for some steps + $99 Apple Dev + App Tracking Transparency consent).
- **Web export broken**: `expo-sqlite` WASM resolution error — not blocking for Android.

## 7. Quality gate before publish
- [x] `npx tsc --noEmit` → 0 errors (verified 2026-10-21)
- [ ] `npx expo export --platform web` succeeds — **KNOWN BROKEN** (expo-sqlite WASM), not blocking for Android
- [ ] Dev build installed on phone, AdMob banner visible, rewarded ad plays on "Support"
- [x] No hardcoded secrets in repo (grep clean)
- [x] Privacy policy URL live (HTTP 200); package name final
- [ ] **EAS project slug renamed to `sapphire`** — BLOCKED (30-секундна дія в дашборді, кроки нижче)
- [ ] **AdMob APPLICATION_ID non-empty у реальній збірці** — BLOCKED (перевіряється `aapt2` після перезбірки)

### Кроки перейменування EAS-проєкту (зробити в браузері, ~30 с)
1. Відкрити `https://expo.dev/accounts/mike4224/projects`
2. Відкрити проєкт `bookreader` (id `59123992-8765-4762-87a4-9449c7384d79`).
3. Settings → змінити **Slug** `bookreader` → `sapphire` → Save.
4. Перевірити: `eas build:list` у `C:\Users\DELL\Sapphire` більше НЕ падає з slug mismatch.

> Після перейменування КОД НЕ ЧІПАТИ: `app.config.js` вже має правильний `extra.eas.projectId`
> і правильний `slug: "sapphire"`. Блокувався лише slug на боці EAS.

## 8. Assets verified (2026-10-21)
| Asset | Path | Dimensions | Status |
|-------|------|------------|--------|
| App icon | `assets/icon.png` | 1024x1024 | ✓ |
| Adaptive icon (foreground) | `assets/adaptive-icon.png` | 432x432 | ✓ |
| Play Store icon | `assets/icon-play-512.png` | 512x512 | ✓ |
| Feature graphic | `docs/sapphire-feature-graphic.png` | 1024x500 | ✓ |
| Adaptive icon config | `app.config.js` | `android.adaptiveIcon` wired | ✓ |

## 9. Screenshots
No device connected (`adb devices` empty). Web export broken → cannot generate via Playwright stand-in. **Action:** connect device for real screenshots.

## 10. Content Rating & Data Safety
Full checklist in `docs/content-rating-data-safety.md`. Key declarations:
- Contains ads: Yes (AdMob banner + rewarded)
- Advertising ID collected & shared with Google AdMob
- No personal data collected; all user data local
- Permissions: INTERNET, ACCESS_NETWORK_STATE, VIBRATE, READ/WRITE_EXTERNAL_STORAGE (file import/export)

---
