# Content Rating & Data Safety Checklist — Sapphire

**Status:** Pre-publish checklist. All items must be completed in Play Console manually.

---

## 1. Content Rating (Questionnaire)

**Target:** All ages / Everyone (lowest maturity)

| Question | Answer | Notes |
|----------|--------|-------|
| App type | Utility / Reading / Education | Offline e-book reader + language learning |
| Violence | None | No violence content |
| Sexual content | None | No sexual content |
| Profanity | None | No user-generated profanity |
| Controlled substances | None | No drug/alcohol content |
| Gambling | None | No gambling mechanics |
| User-generated content | None | App does NOT host UGC (books are user-provided files) |
| Location access | No | No location permission |
| Camera/Microphone | No | No camera/mic permission |
| In-app purchases | No | No Google Play Billing; external donation link only |
| Ads | **Yes — contains ads** | AdMob banner + rewarded (optional) |

**Expected rating:** Everyone / PEGI 3 / ESRB Everyone / USK 0 / GRAC All / ClassInd L

---

## 2. Data Safety (Play Console → App content → Data safety)

### Data collected & shared

| Data type | Collected? | Shared with 3rd parties? | Purpose | Encryption in transit | User can delete? |
|-----------|------------|--------------------------|---------|----------------------|------------------|
| **Device Advertising ID** | Yes (by AdMob SDK) | Yes (Google AdMob) | Personalized/non-personalized ads | Yes (HTTPS) | Reset in device settings |
| **Approximate device info** (model, OS, carrier) | Yes (by AdMob SDK) | Yes (Google AdMob) | Ad targeting/fraud prevention | Yes | N/A (aggregate) |
| **App interaction with ads** | Yes (by AdMob SDK) | Yes (Google AdMob) | Ad performance/attribution | Yes | N/A |
| **Books / reading progress / bookmarks / dictionaries / settings** | **No** (stored locally only) | **No** | N/A (local SQLite + AsyncStorage) | N/A (local) | Yes — delete app or use in-app clear |
| **Translation queries** (text sent to Lingva/Google Translate) | Transient only | Yes (translation provider) | Translation service | Yes (HTTPS) | Not stored |
| **Anki import/export (.apkg)** | Local only | **No** | User workflow | N/A (local) | Yes — delete file |
| **FSRS memory state** | Local only | **No** | Scheduling reviews | N/A (local) | Yes — reset in app |
| **Sentry telemetry** | No (disabled by default, no-op) | No | N/A | N/A | N/A |

### Required declarations in Data Safety form

- [ ] **Advertising ID** — Collected, shared with 3rd party (AdMob), for advertising
- [ ] **Device or other IDs** — Advertising ID (sub-category)
- [ ] **App activity** — Interactions with ads (ad impressions, clicks)
- [ ] **Data shared with third parties** — Yes (Google AdMob for advertising)
- [ ] **Data collected** — Advertising ID + device info + ad interactions
- [ ] **Data encryption** — In transit: Yes (HTTPS for AdMob + translation); At rest: N/A (local only)
- [ ] **User deletion** — Yes (uninstall app = all local data deleted; in-app clear function exists)
- [ ] **Data retention** — Advertising ID: per Google policy; Local data: until user deletes

---

## 3. Target Audience & Content

- [ ] **Primary audience**: Adults (18+)
- [ ] **Not designed for children** — No child-directed features
- [ ] **No appeals to children** — UI, content, marketing all adult-focused
- [ ] **No age gate needed** — App is utility, no restricted content

---

## 4. Ads Declaration

- [ ] **Contains ads**: Yes (AdMob banner in Library; Rewarded ad in "Support the author" modal)
- [ ] **Ad format**: Banner (non-intrusive), Rewarded (user-initiated)
- [ ] **Ad network**: Google AdMob
- [ ] **Test vs Prod IDs**: Dev/Preview builds use test IDs; Production uses real IDs from env

---

## 5. Permissions Declared (merged release manifest — verified 2026-10-26)

| Permission | Source | Reason |
|------------|--------|--------|
| `INTERNET` | app | AdMob (ad requests), translation API, donation link |
| `ACCESS_NETWORK_STATE` | app | AdMob network awareness |
| `VIBRATE` | app | Optional haptic feedback (user setting) |
| `READ_EXTERNAL_STORAGE` | app | Import books from storage |
| `WRITE_EXTERNAL_STORAGE` | app | Export Anki decks / backup |
| `ACCESS_ADSERVICES_AD_ID` | AdMob SDK | Advertising ID for ads |
| `ACCESS_ADSERVICES_ATTRIBUTION` | AdMob SDK | Ad attribution |
| `ACCESS_ADSERVICES_TOPICS` | AdMob SDK | Ad topics |
| `FOREGROUND_SERVICE` | library | Background service (library) |
| `WAKE_LOCK` | library | Keep CPU awake (library) |

**`SYSTEM_ALERT_WINDOW` — REMOVED.** Expo's bare-minimum manifest template ships it by default and
`android.permissions` only ADDS to the template, never removes. Added
`plugins/withRemoveSystemAlertWindow.js` to strip it — verified **0 occurrences** in the merged release
manifest. Play treats this permission as sensitive (needs a core-feature justification) and Sapphire
never draws over other apps.

**Play Console flags:**
- `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` → File access → justify: import/export user books & Anki decks
- `INTERNET` + `ACCESS_NETWORK_STATE` → Network → AdMob + translation

---

## 6. Pre-Submit Verification

- [ ] App compiles: `npx tsc --noEmit` → 0 errors ✓
- [ ] Web export: `npx expo export --platform web` — **KNOWN BROKEN** (expo-sqlite WASM issue, not blocking for Android)
- [ ] Dev build on device: AdMob banner visible, rewarded plays ✓
- [ ] No hardcoded secrets: `grep -r "apiKey\|secret\|token" --include="*.ts" --include="*.js" .` → clean
- [ ] Package name final: `com.mike.wolfskin` (cannot change after first publish)
- [ ] Version code: 2 (increment for each Play upload)
- [ ] Privacy policy URL set in `app.config.js`: `https://402035zombie-a11y.github.io/sapphire/docs/privacy-policy.html`
- [ ] Feature graphic: `docs/sapphire-feature-graphic.png` (1024x500 ✓)
- [ ] Icons: `assets/icon.png` (1024x1024 ✓), `adaptive-icon.png` (432x432 ✓), `icon-play-512.png` (512x512 ✓)
- [ ] Adaptive icon wired: `android.adaptiveIcon` in `app.config.js` ✓
- [ ] EAS production build: `EAS_NO_VCS=1 eas build --profile production --platform android` — **IN PROGRESS**

---

## 7. Post-Launch Actions

- [ ] Monitor AdMob fill rate / eCPM
- [ ] Verify no crash spikes in Play Console vitals
- [ ] Check Data Safety form accuracy after 1st real user data
- [ ] Plan version 1.0.1 for any hotfixes

---

*Generated: 2026-10-21 — part of T11 Publish prep*