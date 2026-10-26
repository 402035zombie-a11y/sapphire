# HANDOFF — Sapphire

> Читай це ПЕРШИМ. Це єдине джерело актуальної правди. Старі `BUGS_ROUND*.md` / `ROUND5.md` /
> `FORMATS_ROUND.md` / `ARCH_ANALYSIS.md` ВИДАЛЕНІ — вони містили застарілі PENDING, що вводили в оману.
> Актуальний канбан — `KANBAN_DETAILED.md`. Інструкція запуску/білду — `DEV-GUIDE.md`.
>
> **АКТУАЛЬНИЙ СТАН + БЛОКЕРИ (2026-10-26): `.hermes/plans/2026-10-26_phase3-4-blockers.md`**
> (EAS projectId = старий проєкт `bookreader` → білд падає; privacyPolicyUrl = 404, репо private;
> телефон не підключений; APK не містять AdMob ID).

## Що це
- React Native + Expo SDK54, **New Architecture**, Android-only. iOS не налаштовано.
- Package: `com.mike.wolfskin` (фінальний, збігається з Play Console). Slug: `sapphire`.
- APP_NAME: `Sapphire`.
- **EAS projectId:** `59123992-8765-4762-87a4-9449c7384d79` — ⚠️ ЦЕ СТАРИЙ ПРОЄКТ (slug `bookreader`).
  `eas build` падає: slug mismatch. Правильний ID — в EAS dashboard. Деталі: `.hermes/plans/2026-10-26_phase3-4-blockers.md`.
- **EAS-акаунт: `mike4224`** (`eas whoami` → mike4224 / 402035zombie@gmail.com). Не `mike2424`.

## Потік даних (читання книги)
1. `LibraryScreen` → `importBook` (parse-once) → глави пишуться в `books.db` (expo-sqlite) через `services/bookImport.ts:getBookChapters`.
2. `ReaderScreen` читає глави з БД (`getBookChapters`), ріже на речення `splitIntoSegments` (sentence level, НЕ по `<p>`).
3. Переклад per-sentence: `translationService.ts` (v1 Google GTX, безключовий) — **основний**.
   `translationServiceV2.ts` (Lingva + фолбек на v1 GTX) — використовується для prefetchAhead.
   Ключ перекладу: `paragraphIndex*1000 + sentenceIndex` (fix `ed148ad`).
4. Перекладені речення зберігаються в **SQLite** `books.db` — `services/sentenceTranslationsDb.ts`
   (складений ключ `(book_id, skey, lang)`). `libraryStore.sentenceTranslations` — МЕРТВЕ поле, не чіпай.

## Нативні модулі (TurboModule, JSI)
- `NativeBookParser` (Kotlin) — EPUB/FB2 парсинг. Фасад `services/bookParser.ts` → тихий JS-fallback.
- `NativeBookTTS` (Kotlin) — TextToSpeech.
- Обидва ВИДАЛЕНО (2026-10-23): `android/app/src/main/java/com/sapphire/` більше не існує. Нативний код — лише `com/mike/wolfskin/`.
- `specs/NativeBookParser.ts` + `specs/NativeBookTTS.ts` — codegen-спеки.

## Критичні правила (інакше впаде)
1. **Білд тільки хмарний через WSL.** Windows EAS CLI зламаний (git clone 3-слеш).
   ```bash
   wsl.exe -e bash -lc 'cd /mnt/c/Users/DELL/Sapphire && export ANDROID_HOME=/opt/android-sdk ANDROID_SDK=/opt/android-sdk JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 && eas build --profile preview --platform android --non-interactive --no-wait'
   ```
2. **dev-client потребує mmkv 2.x** (не 3.x) — інакше "native MMKV Module could not be found".
   `appStore.ts` вже на AsyncStorage (не mmkv). `react-native-mmkv` у package.json — dead-dep, не видаляй (рве lockfile).
3. **metro.config.js** — ДЕФОЛТНИЙ (аліаси `react-native-web` та AdMob-mock прибрані комітом `796e4b7`,
   2026-09-05). НЕ відновлюй наосліп — збірки після 09-05 успішні, але `react-native-web@^0.21.0`
   досі в deps (латентний ризик «View config getter for component 'pre'»).
4. **AdMob**: dev-client APK не має нативного модуля → `monetization.native.ts` + `AdBanner.native.tsx` роблять lazy `require`.
   Prod-білд (EAS) має реальну рекламу (alias не діє в проді).
5. **ОДИН білд у кінці етапу** — користувач заборонив білди між фіксами (2026-08-14).

## Перевірка перед білдом
- `npx tsc --noEmit` → EXIT 0 (обов'язково).
- LAN IP для телефону (expo start): реальний WiFi ПК, НЕ WSL 172.x.
- `pkill -9 -f gradle` перед новим білдом.

## Що вже зроблено (стан на 2026-10-21)
- **Усі 12 задач T1–T12 (Kanban) — COMPLETED.** Повний лог: `.hermes/plans/implementation-plan-log.md`.
- T1 парсери: 8 форматів (RTF/FB2/MOBI/DOCX/ODT/HTML/EPUB/ZIP) на реальних файлах, 0 U+FFFD.
- T2 `npx tsc --noEmit` → EXIT 0.
- T3–T8, T10 — **перевірено на телефоні** (Xiaomi 23124RA7EO, `1d32a2e2`): BookCard import states,
  теми Day/Night/Blackout, reader (dual/SpeedReading/TTS/word-tap), словник (15077 сл.),
  тренування (4 режими), i18n (43 мови), налаштування (font/theme/language).
- T9 monetization: реальні AdMob ID (App `~8371247908`, Banner `/4712038644`, Rewarded `/1663349260`),
  Donate → `nowpayments.io/donation/sapphire-reader`.
- T11 publish prep: EAS/AdMob/privacy policy (`402035zombie@gmail.com`)/icons (1024+432+512)/
  feature graphic (1024×500) — **конфіг готовий, production AAB ще НЕ зібрано**.
- PERF-4: ReaderScreen `chapters`-memo по `[bookId]` (не `[book]`) — БД не читається на кожен переклад.
- translationServiceV2: фолбек на v1 GTX коли нема Lingva.
- metro.config.js: дефолтний (аліаси прибрані 2026-09-05).

## Поточний стан git (2026-10-21)
- Branch: `fix/ui-bugs`, **синхронізовано** з `origin/fix/ui-bugs` (0 попереду / 0 позаду, перевірено 2026-10-26).
- Останні коміти: `70756b0c` (RTF byte-level parsing, LanguageDropdown scroll, SpeedReading ticker),
  `28d1dab2` (внутрішні тіні в білій темі), `121bbb36` (прибрано Web Worker).
- Незакомічені зміни: `PUBLISHING.md`, `app.config.js` (privacyPolicyUrl → GitHub Pages),
  `docs/privacy-policy.html` (реальний email), `package.json`/`package-lock.json` (expo-dev-client у devDeps).
- Untracked (97 файлів) — переважно артефакти перевірки: `scripts/test-parsers-runner.js`,
  `scripts/*-audit.py`, `ui*.xml` (UI-дампи), `theme_*.png`, `.test-parsers-bundle/`.
  **НЕ комітити** `.test-parsers-bundle/` та `ui*.xml` — це змістові артефакти, додати в `.gitignore`.

## Доведено на телефоні (2026-10-21) — НЕ переписувати
1. `adb reverse tcp:8081 tcp:8081` + deep link `exp+sapphire://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081`
   відкриває додаток у `MainActivity` (без ручного вибору сервера в Dev Menu).
2. Бандл збирається: `Bundled 24227ms node_modules/expo/AppEntry.js (1823 modules)`, 11.3 MB, 0 помилок.
   Точка входу — `node_modules/expo/AppEntry.js` (НЕ `index.js` — такого файлу немає).
3. UI-дамп через `adb shell uiautomator dump` — надійніший спосіб перевіряти UI без скріншотів.
4. Піксель-аудит тем через PIL: Day modal bg `#EAD9BE`, Night `#1C1D21`, Blackout `#050505` (flat, без градієнтів).


## НЕ роби
- Не видаляй `react-native-mmkv` з package.json (dead-dep, але рве lockfile).
- Не міняй package `com.mike.wolfskin` (після першої публікації незмінюваний).
- Не додавай PDF/MOBI парсинг (важкі нативні залежності; PDF — зовнішній вьюер).

## ⚠️ КРИТИЧНИЙ УРОК (2026-08-20, втрачено 3+ білди через це)
**AdMob + app.config.js — НЕ чіпай без локальної перевірки.**
- `react-native-google-mobile-ads` plugin НЕСУМІСНИЙ з expo 54 / eas-cli 22 у режимі `expo config --json`
  (падає мовчки, exit 1 → EAS білд не стартує). ТОМУ plugin прибрано, але тоді у `AndroidManifest.xml`
  зникає `com.google.android.gms.ads.APPLICATION_ID` → апка крашить на старті:
  `MobileAdsInitProvider: Invalid application ID`.
- **РОБОЧЕ РІШЕННЯ** (коміт `37c25a2`): вписати `android:value` напряму в `expo-build-properties` manifest
  meta-data, і ОБОВ'ЯЗКОВО **хардкодом** (не `process.env` — `expo-build-properties` його не резолвить → value порожній → краш).
- `expo-build-properties` meta-data формат:
  ```js
  ["expo-build-properties", { android: { manifest: { application: { "meta-data": [
    { "$": { "android:name": "com.google.android.gms.ads.APPLICATION_ID", "android:value": "ca-app-pub-5113967448800652~8371247908" } }
  ] } } } }]
  ```

**ПЕРЕД КОЖНИМ БІЛДОМ — локальна перевірка (не витрачай спроби EAS!):**
1. `./node_modules/.bin/expo config --json > cfg.json 2>cfg.err` → має бути EXIT 0 і непорожній JSON.
2. Перевірити, що AdMob ID у Manifest НЕ порожній:
   ```bash
   # зібрати APK локально НЕ треба — дістати manifest з готового білду:
   aapt2 dump xmltree APK.apk --file AndroidManifest.xml | grep -A1 "APPLICATION_ID"
   # має бути android:value="ca-app-pub-5113967448800652~8371247908" (НЕ "")
   ```
3. `npx tsc --noEmit` → EXIT 0.

**ЛІМІТ EAS:** безкоштовні білди ОБМЕЖЕНІ на місяць. Не запускай білд, якщо не впевнений на 100% (не перевірив конфіг локально).
Один білд = 15+ хв + спроба. Витративши всі спроби — дебаг неможливий до наступного місяця.

**СТАРІ РОБОЧІ БІЛДИ (не перебілдовуй, якщо є):** історія `eas build:list` показує готові APK.
Білд `770c491b` / `bd17a749` (коміт `8db2281`, до зламу app.config.js) — робочий dev-client, АЛЕ старий код.
Білд `49c5d7a1` (коміт `37c25a2`, хардкод AdMob) — має бути без крашу + нові фікси.

**Metro для дебагу через USB:** запускати НА WINDOWS (`npx expo start --host localhost`), бо WSL2 не біндить localhost.
Телефон підключений до Windows adb (не WSL). `adb reverse tcp:8081 tcp:8081` → у dev-client вписати `http://localhost:8081`.
Ноут НЕ в тій же WiFi що телефон (ноут 172.31.x віртуалка, телефон 192.168.1.x) → тільки через USB reverse.
