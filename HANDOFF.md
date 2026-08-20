# HANDOFF — BookReader (APP_NAME: Sapphire)

> Читай це ПЕРШИМ. Це єдине джерело актуальної правди. Старі `BUGS_ROUND*.md` / `ROUND5.md` /
> `FORMATS_ROUND.md` / `ARCH_ANALYSIS.md` ВИДАЛЕНІ — вони містили застарілі PENDING, що вводили в оману.
> Актуальний канбан — `KANBAN_DETAILED.md`. Інструкція запуску/білду — `DEV-GUIDE.md`.

## Що це
- React Native + Expo SDK54, **New Architecture**, Android-only. iOS не налаштовано.
- Package: `com.mike.wolfskin` (фінальний, збігається з Play Console). Slug: `bookreader`.
- APP_NAME: `Sapphire` (бренд, не BookReader).
- EAS projectId: `c6014b22-df9e-464c-903c-ffa9a5793249`.
- **EAS-акаунт: `mike2424`** (НЕ `mike4224` — це помилка в старому handoff-файлі, більше не існує).

## Потік даних (читання книги)
1. `LibraryScreen` → `importBook` (parse-once) → глави пишуться в `books.db` (expo-sqlite) через `services/bookImport.ts:getBookChapters`.
2. `ReaderScreen` читає глави з БД (`getBookChapters`), ріже на речення `splitIntoSegments` (sentence level, НЕ по `<p>`).
3. Переклад per-sentence: `translationService.ts` (v1 Google GTX, безключовий) — **основний**.
   `translationServiceV2.ts` (Lingva + фолбек на v1 GTX) — використовується для prefetchAhead.
   Ключ перекладу: `paragraphIndex*1000 + sentenceIndex` (fix `ed148ad`).
4. Перекладені речення зберігаються в `book.sentenceTranslations` (libraryStore → AsyncStorage JSON).
   ⚠️ ТЕХБОРГ: на 50k+ речень — freeze (треба SQLite, як chapters). Не чіпай без наказу.

## Нативні модулі (TurboModule, JSI)
- `NativeBookParser` (Kotlin) — EPUB/FB2 парсинг. Фасад `services/bookParser.ts` → тихий JS-fallback.
- `NativeBookTTS` (Kotlin) — TextToSpeech.
- Обидва реально існують в `android/app/src/main/java/com/bookreader/app/{bookparser,booktts}/`.
- `specs/NativeBookParser.ts` + `specs/NativeBookTTS.ts` — codegen-спеки.

## Критичні правила (інакше впаде)
1. **Білд тільки хмарний через WSL.** Windows EAS CLI зламаний (git clone 3-слеш).
   ```bash
   wsl.exe -e bash -lc 'cd /mnt/c/Users/DELL/BookReader && export ANDROID_HOME=/opt/android-sdk ANDROID_SDK=/opt/android-sdk JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 && eas build --profile preview --platform android --non-interactive --no-wait'
   ```
2. **dev-client потребує mmkv 2.x** (не 3.x) — інакше "native MMKV Module could not be found".
   `appStore.ts` вже на AsyncStorage (не mmkv). `react-native-mmkv` у package.json — dead-dep, не видаляй (рве lockfile).
3. **metro.config.js** має ОБИДВА аліаси: `alias['react-native-web']=false` (інакше 'View config getter for component pre')
   + `extraNodeModules['react-native-google-mobile-ads']` → mock (dev-client без нативного модуля не падає).
   Не прибирай жоден.
4. **AdMob**: dev-client APK не має нативного модуля → `monetization.native.ts` + `AdBanner.native.tsx` роблять lazy `require`.
   Prod-білд (EAS) має реальну рекламу (alias не діє в проді).
5. **ОДИН білд у кінці етапу** — користувач заборонив білди між фіксами (2026-08-14).

## Перевірка перед білдом
- `npx tsc --noEmit` → EXIT 0 (обов'язково).
- LAN IP для телефону (expo start): реальний WiFi ПК, НЕ WSL 172.x.
- `pkill -9 -f gradle` перед новим білдом.

## Що вже зроблено (стан на 2026-08-20)
- Усі UI-баги T1–T13, ROUND2/3/5, FORMATS — виконані (див. `KANBAN_DETAILED.md` етапи 1–16).
- PERF-4: ReaderScreen `chapters`-memo по `[bookId]` (не `[book]`) — БД не читається на кожен переклад.
- translationServiceV2: фолбек на v1 GTX коли нема Lingva.
- metro.config.js: регрес виправлено (обидва аліаси).

## НЕ роби
- Не видаляй `react-native-mmkv` з package.json (dead-dep, але рве lockfile).
- Не міняй package `com.mike.wolfskin` (після першої публікації незмінюваний).
- Не додавай PDF/MOBI парсинг (важкі нативні залежності; PDF — зовнішній вьюер).
