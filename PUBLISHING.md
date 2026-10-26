# Sapphire — Publishing & Release Guide

Source of truth for going live: install on device, publish to Google Play, connect ads.

## 0. Prerequisites (create accounts BEFORE building)
- [x] **Google Play Developer Account** — one-time $25 at play.google.com/console (verify current price). Required to publish.
- [x] **AdMob account** — admob.com (same Google login). Create an **App** → copy **App ID** (`ca-app-pub-5113967448800652~8371247908`). Inside it create two **Ad Units**:
  - Banner: `ca-app-pub-5113967448800652/4712038644`
  - Rewarded: `ca-app-pub-5113967448800652/1663349260`
- [x] **Privacy Policy URL** — LIVE (2026-10-26): `https://402035zombie-a11y.github.io/sapphire/docs/privacy-policy.html` → **HTTP 200**. Repo `402035zombie-a11y/sapphire` made public + Pages enabled on `main` (root).
- [x] **Expo EAS** — `eas login` (account: **mike4224** / 402035zombie@gmail.com). ✅ 2026-10-26: створено проєкт `@mike4224/sapphire` (id `34cd71e8-645b-4ab5-ad87-ab7dd0243e9e`). Старий `59123992-…` (slug `bookreader`) **незмінний** — slug не має REST/GraphQL endpoint для перейменування, тому створено новий проєкт.
- [ ] **NOWPayments donation URL** — ⚠️ **ОБОВ'ЯЗКОВО ПЕРЕД РЕЛІЗОМ.** Зараз `services/donate.ts` має placeholder `https://nowpayments.io/donation/sapphire-reader` (JS-оболонка NOWPayments, реальної сторінки донату не існує — перевірено 2026-10-26). Потрібно: створити сторінку донату в NOWPayments → вписати URL у `EXPO_PUBLIC_DONATE_URL` (`eas.json` env) або замінити fallback в `app.config.js:34`. Без цього кнопка «Donate» відкриває мертве посилання.
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
- **Реальні AdMob ID задіяні ЗАВЖДИ** (не «test by default», як було написано раніше — це була хибна
  теза). Джерело: `app.config.js` → `extra.admob.{appId,bannerId,rewardedId}` → `Constants.expoConfig.extra.admob.*`.
- Детект тестового ID є лише для rewarded (`services/monetization.native.ts:13`,
  `isRealAdUnit = !startsWith('ca-app-pub-3940256099942544')`) і використовується як **заглушка**:
  `adsUnavailableReason()` повертає `'AdMob rewarded unit is a test ID'` → `showSupportAd()` не показує рекламу.
  Банер (`components/AdBanner.native.tsx`) такого детекту **не має** — крутиться з реальним ID.
- **Наслідок:** preview/dev-білд показує **реальні** оголошення. Для AdMob це означає реальні
  impressions; тривале тестування своїм пристроєм створює трафік з одного джерела — ризик
  «invalid traffic». Якщо потрібна безпечна тестова збірка — ставити **тестові** ID в `app.config.js`
  (`extra.admob.*`), а не розраховувати на авто-перемикання.
- `requestNonPersonalizedAdsOnly: true` — запит без персоналізації (належить до політики AdMob + GDPR).
- Banner рендериться в LibraryScreen; rewarded — з модалки «Support the author».


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
- [x] **EAS project slug** — ✅ ВИРІШЕНО 2026-10-26: створено новий проєкт `@mike4224/sapphire`
  (id `34cd71e8-645b-4ab5-ad87-ab7dd0243e9e`). Старий `59123992-…` (slug `bookreader`) **незмінний** —
  slug не має REST/GraphQL endpoint для перейменування. `app.config.js` вказує на новий ID,
  `eas build:list` працює (`[]`).
- [x] **AdMob APPLICATION_ID non-empty у реальній збірці** — ✅ 2026-10-26: `expo prebuild` + `gradlew :app:processReleaseManifest` → мержений манифест має `ca-app-pub-5113967448800652~8371247908`, deep link `exp+sapphire`, `versionCode 2`

### Якісні фікси сесії 2026-10-26 (усі закомічені, `tsc` exit 0)
| Проблема | Файл | Стан |
|---|---|---|
| «Export backup (JSON)» на Android = тупик («available in the web version») | `components/AppSettingsModal.tsx` | ✅ cache-файл + Sharing sheet |
| Бренд-перейменування осиротило ВСІ persisted-дані (книги/словник/тема) | `store/createStore.ts` (+5 сторів) | ✅ one-time міграція `legacyName`, тест 12/12 |
| Комент брехав («hard ~×1.2»), мертвий код | `services/fsrs.ts` | ✅ поведінка байт-у-байт (480 кейсів) |
| Temp-файл парсера не видалявся при помилці | `services/parserClient.ts` | ✅ `deleteAsync` у `finally` |
| 5 ключів i18n відсутні в `uk.ts`; `at`→`after` desync | `i18n/uk.ts`, `SpeedReadingScreen.tsx` | ✅ |
| `SYSTEM_ALERT_WINDOW` з шаблону Expo (Play-sensitive) | `plugins/withRemoveSystemAlertWindow.js` | ✅ 0 у мерж. манифесті |
| Положення privacy/store-listing vs код (Sentry, «no tracking») | `docs/*` | ✅ приведено до коду |

### Відкрите питання для користувача (НЕ чіпав — конфлікт із протестованим флоу)
1. **TF (700 ms) і Cloze (900 ms) авто-переходять** після відповіді — правило користувача
   «після відповіді НЕ робити авто-перехід» стосувалось type-режиму (там `352f904` його прибрав),
   але TF/Cloze не торкались. `git blame`: рядки недоторкані з `ce65a49`/`2e53c4a`.
2. **У TF і Cloze немає кнопки «I know it»** — вона лише в type. Правило «видалити одним тапом»
   у цих режимах недосяжне.
   → Обидва пункти в `TrainingScreen.tsx:429,516` (авто-перехід) і `858-865` (кнопка).
   Детальніше: `.hermes/plans/2026-10-26_phase3-4-blockers.md` §17.


### EAS-проєкт — як це вирішено (2026-10-26)
Перейменування slug в EAS **неможливе**: проверено REST (`PATCH`/`PUT`/`POST` → `Method Not Allowed`/`Not Found`)
і GraphQL (інтроспекція схеми: 88 mutations, `AppInfoInput` має лише `displayName` — поля `slug` нема).
Тому створено **новий** проєкт зі slug з конфіга застосунку (`eas init` бере `exp.slug`):
```
eas init --account mike4224 --non-interactive
→ ✔ Created @mike4224/sapphire: https://expo.dev/accounts/mike4224/projects/sapphire
→ id 34cd71e8-645b-4ab5-ad87-ab7dd0243e9e  (записано в app.config.js extra.eas.projectId)
```
Старий проєкт `@mike4224/bookreader` (id `59123992-…`) лишається, але для цього застосунку **непридатний**
(його slug назавжди `bookreader`). Перевірка: `eas build:list` → `[]` (без помилки slug mismatch).

### versionCode — для КОЖНОЇ наступної збірки
`app.config.js` має `android.versionCode: 2`. Google Play відхиляє завантаження з уже існуючим
versionCode. Для першої публікації `2` — ок; для кожного наступного релізу вершити ОДЕ з:
- вписати `versionCode + 1` в `app.config.js` (і закомітитизи), або
- додати `"autoIncrement": true` у `production`-профіль `eas.json` (тоді EAS змінює його сам).

**Не забувай про це перед ДРУГИМ `eas build --profile production`.**

### Перед `eas submit` (окремі передумови)
У репо **немає** `credentials.json` (Play service account) і локального keystore — це окремі кроки:
1. **Play service account JSON**: Play Console → Setup → API access → створити service account →
   завантажити JSON-ключ. Без нього `eas submit` не викорінтує AAB у Play.
2. **EAS Android credentials**: `eas credentials:configure --platform android --profile production`
   (EAS може згенерувати upload keystore; Play App Signing тримає release-ключ).
3. Підтвердити, що у `eas.json` `production.credentialsSource` не конфліктує з локальним ключем.

**Перше завантаження в Play робити через `eas submit --platform android` (production), не вручну** —
так EAS один раз налаштує підписування й не доведеться ламати його в майбутньому.



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
- No personal data (PII) collected by the app; all user data local. AdMob collects the Advertising ID (declared above); translation requests go to Google/Lingva.
- Permissions: INTERNET, ACCESS_NETWORK_STATE, VIBRATE, READ/WRITE_EXTERNAL_STORAGE (file import/export)

---
