# Sapphire — стан 2026-10-26 + блокери Фази 3/4

> Продовження з чистого контексту. Перевірено програмно (не на око).
> Джерела: `HANDOFF.md` (частково ЗАСТАРІЛИЙ — див. п.6), `HANDOFF_NEXT_AGENT.md`, git, EAS API, GitHub API, aapt2.

## 1. Що перевірено фактами (2026-10-26)

| Перевірка | Команда | Результат |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | **exit 0** |
| Парсери | `node scripts/test-parsers-runner.js` | **exit 0**, U+FFFD = **0** |
| Perf-фікс | `node scripts/bench-book-open.js` | 2 MB: 269 → **110 ms**; A==B = YES |
| Бренд-пурж | `grep -rniE "book[\s_-]?reader"` (без node_modules/.git/android) | чисто; згадки лише в `HANDOFF_NEXT_AGENT.md` (meta) |
| Resolved config | `expo config --json` | **exit 0**, 1758 B; AdMob meta-data є |
| Git | `git rev-list --left-right --count origin/fix/ui-bugs...HEAD` | **0 / 0** — синхронізовано (brief казав "3 попереду" — ЗАСТАРІЛО) |
| Remote | `git remote get-url origin` | `github.com/402035zombie-a11y/sapphire` ✅ |
| Телефон | `adb devices` | **порожньо** — не підключений |

**Дерево:** чисте, окрім `HANDOFF_NEXT_AGENT.md` (незакомічена правка КОРИСТУВАЧА: прибрано військовий статус, EN A2-C1 → b1-b2). Не чіпати.

## 2. БЛОКЕР 1 — телефон не підключений (Фаза 3, п.4–5)

Фаза 3 (book-open lag) закомічена (`10b0627`), але **підтвердження на телефоні не отримано**.
Зміна схеми (`0acb144`) + perf-код живуть ТІЛЬКИ в APK — Metro/reload не доставляє.
**Потрібно:** телефон по USB → перезбірка release APK → встановлення → замір.

## 3. БЛОКЕР 2 — EAS projectId вказував на СТАРИЙ проєкт — ✅ ВИРІШЕНО 2026-10-26

`app.config.js:33` вказував на `59123992-…` (проєкт `@mike4224/bookreader`). Кожен `eas build` падав:
`Slug for project identified by "extra.eas.projectId" (bookreader) does not match the "slug" field (sapphire)`.

**Перейменування slug НЕМОЖЛИВЕ** (перевірено):
- REST: `PATCH`/`PUT`/`POST /v2/projects/<id>` → `Method Not Allowed`; `/slug`, `/rename` → `Not Found`.
- GraphQL (`POST /graphql`, інтроспекція схеми): 88 mutations; `AppMutation` має `setAppInfo(appId, appInfo)`,
  але `AppInfoInput` містить **лише `displayName`** — поля `slug` немає. `AccountMutation.rename` — це ім'я акаунта.

**Рішення:** створено новий проєкт зі slug з конфіга (`eas init` бере `exp.slug`):
```
eas init --account mike4224 --non-interactive
→ Created @mike4224/sapphire  (id 34cd71e8-645b-4ab5-ad87-ab7dd0243e9e)
```
ID записано в `app.config.js`. Перевірено: `eas project:info` → `@mike4224/sapphire`; `eas build:list` → `[]`.
Старий проєкт `@mike4224/bookreader` лишається, але для застосунку непридатний (slug незмінний).
Коміт `342c889`. Для відкату: `eas project:delete` + повернути старий ID.

## 4. БЛОКЕР 3 — privacyPolicyUrl веде в 404 — ✅ ВИРІШЕНО 2026-10-26

- Причина: репо `402035zombie-a11y/sapphire` = **`private`**, аккаунт GitHub = **безкоштовний план** → Pages неможливий.
- **Рішення користувача:** зробити репо публічним.
- **Виконано:** `PATCH /repos/... {"private":false}` → `visibility=public`; `POST /repos/.../pages {branch: main, path: /}`.
- **Перевірено:** `https://402035zombie-a11y.github.io/sapphire/docs/privacy-policy.html` → **HTTP 200** ✅
- **Безпековий аудит після публікації:** `git ls-files .env` = пусто; `git grep` по PAT/AKIA/sk- = пусто;
  секретів у 309 tracked-файлах немає. `.env` у `.gitignore`.


## 5. Додаткові ризики (не блокують, але фіксати)

1. **APK не містять AdMob ID — ✅ ВИРІШЕНО 2026-10-26 (перевірено локально, без EAS).**
   У СТАРИХ APK в `artifacts/apks/` (Oct 21–23) `aapt2` показував `APPLICATION_ID` = `""`.
   Причина: фікс (`app.json` з `android_app_id`, коміт `88a1c9b` 2026-10-23 **23:38**) з’явився ПІСЛЯ
   останнього APK (`build-1792778033289.apk`, Oct 23 **20:53**) — тому старі APK нею не володіли.
   **Локальна перевірка (2026-10-26):**
   ```
   npx expo prebuild                                   # exit 0, android/ регенеровано з app.config.js
   ./gradlew :app:processReleaseManifest               # BUILD SUCCESSFUL in 6m 18s
   android/app/build/intermediates/merged_manifests/release/processReleaseManifest/AndroidManifest.xml
   ```
   У мерженому манифесті:
   - `com.google.android.gms.ads.APPLICATION_ID` = **`ca-app-pub-5113967448800652~8371247908`** ✅ (НЕ порожній)
   - `com.google.android.gms.permission.AD_ID` + `MobileAdsInitProvider` зареєстровані ✅
   - deep link: `<data android:scheme="sapphire"/>` + `<data android:scheme="exp+sapphire"/>` ✅
   - `package="com.mike.wolfskin"`, `versionCode="2"`, `versionName="1.0.0"` ✅
   **Висновок:** фікс працює. EAS-збірка виконує ті самі кроки (prebuild з `app.json`), тому манифест
   буде ідентичний. Перевірка виконана БЕЗ EAS — тобто slug-блокер на цей пункт не впливає.

2. **`metro.config.js` втратив обидва аліаси** (коміт `796e4b7`, 2026-09-05) — зараз дефолтний.
   `HANDOFF.md` стверджує, що аліаси обов'язкові — **застаріло**. Збірки після 09-05 успішні, але
   `react-native-web@^0.21.0` досі в deps → латентний ризик. НЕ відновлювати наосліп.
3. **`HANDOFF_NEXT_AGENT.md` містить 4 згадки `BookReader`** — їх немає в списку навмисних винятків
   (`.hermes/plans/2026-10-25_brand-rename-plan.md:39`). Документ для агента, не код. Питання користувачу.
4. **`HANDOFF.md` застарілий** у 5 місцях — див. п.6.

## 6. HANDOFF.md — виправлені неточності (зроблено в цій сесії)

| Рядок | Було (неправда) | Стало (факт) |
|---|---|---|
| 11 | EAS projectId `c6014b22-…` | `59123992-…` = проєкт `bookreader` (slug mismatch → білд падає); правильний ID — в EAS dashboard |
| 12 | EAS-акаунт `mike2424` | **`mike4224`** (`eas whoami`) |
| 20 | переклади в `libraryStore` → AsyncStorage | **SQLite** `services/sentenceTranslationsDb.ts`; `libraryStore.sentenceTranslations` — мертве поле |
| 36–38 | metro.config.js має ОБИДВА аліаси | аліаси прибрані с 2026-09-05 (`796e4b7`); файл дефолтний |
| 64 | «6 комітів попереду» | **0** — синхронізовано |

## 7. Наступні кроки

1. **Користувач:** перейменувати slug EAS-проєкту (`bookreader` → `sapphire`), кроки — `PUBLISHING.md` §7.
2. **Перезбірка release APK** (схема `exp+sapphire://` + perf-код живуть ТІЛЬКИ в APK).
3. **`aapt2` на новому APK:** AdMob value = `ca-app-pub-5113967448800652~8371247908`; scheme `exp+sapphire`.
4. **Телефон:** `adb devices` → `pm install -r -t` → MIUI-гранти → чекліст Фази 3 (4 пункти).
5. **Play:** AAB, Content Rating + Data Safety (веб-форми), скріншоти з телефона, feature graphic.


## 8. Команди

```bash
cd /c/Users/DELL/Sapphire
npx tsc --noEmit
node scripts/test-parsers-runner.js
adb devices
aapt2 dump xmltree --file AndroidManifest.xml <apk> | grep APPLICATION_ID   # /c/Users/DELL/AppData/Local/Android/Sdk/build-tools/36.0.0/aapt2
wsl.exe -e bash -lc 'cd /mnt/c/Users/DELL/Sapphire && export ANDROID_HOME=/opt/android-sdk ANDROID_SDK=/opt/android-sdk JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 && eas build --profile preview --platform android --non-interactive --no-wait'
```

## 9. Code audit 2026-10-26 (проактивна перевірка — багів НЕ знайдено)

| Що перевіряв | Метод | Висновок |
|---|---|---|
| Інваріант `sentences[].index` (ключ `skey`) | порівняння `git show 10b0627^:screens/ReaderScreen.tsx` vs `readerSentences.ts` | ✅ формула ідентична: `index = (ch.idx*1000 + si)*1000`. Тонкість: у старому коді `si++` був ПОЗА `if (s)`, у новому — всередині; але `splitIntoSegments` робить `.filter(Boolean)`, тому порожніх нема → еквівалентно |
| Міграція `sentence_translations` (PK без `lang`) | симуляція SQLite (Python) | ✅ коректна, ідемпотентна, legacy `lang='__legacy__'`, multilingual upsert працює |
| Читання локальних файлів у парсерах | читання всіх 8 парсерів | ✅ `fetch()` ТІЛЬКИ в гварді `^https?://`; `content://`/`file://` → `expo-file-system/legacy` + `copyAsync` + `readAsStringAsync(base64)` |
| `require('expo-file-system/legacy')` (top-level = краш усього застосунку) | `node_modules/expo-file-system/legacy.ts` + grep бандла | ✅ `export * from './src/legacy'`; `readAsStringAsync`/`copyAsync`/`cacheDirectory` присутні у release-бандлі |
| Тема Blackout = FLAT | `themes.ts` + `neu.ts` | ✅ `flat: true` → `{borderRadius, borderWidth:1, borderColor: primaryText}`, без boxShadow/прозорості |
| Тема Day (регресія внутрішніх тіней) | `themes.ts` | ✅ `shadowLight: 'rgba(210,195,165,0.7)'` (теплий, НЕ білий), `base: '#EAD9BE'` |
| Perf-фікс у бандлі | grep release-бандла | ✅ `getReaderSentences`/`segmentsByParagraph`/`paraToFirstSentence`/`fromDb` = 1 кожен; `splitIntoSegments` = 1 (було 4) |
| Runtime-конфіг у бандлі | grep | ✅ Lingva URL, donate URL присутні; AdMob ID — у манифесті (не в JS) |

**Правило:** коли код читає файл на нативі — `fetch()` не є універсальним. Гвард `^https?://` + `expo-file-system/legacy`
для всього локального — це єдиний безпечний патерн; будь-який новий парсер мусить його дотримуватись.

## 10. Меліорації (не блокують — свідомо НЕ чіпав, щоб не ламати робочий імпорт)

1. **Cache leak у парсерах.** `epubParser`, `docxParser`, `odtParser`, `mobiParser`, `rtfParser`, `fb2Parser`
   копіюють книгу у `FileSystem.cacheDirectory` (`br_epub_<ts>.epub` тощо) і **не видаляють** її після
   парсингу. Лише `parserClient.runOnMain` робить `deleteAsync`. При багатьох імпортах кеш розростається
   (книги — мегабайти). Фікс: `try { ... } finally { deleteAsync(cacheUri, {idempotent:true}) }` у кожному.
   Свідомо відкладено: імпорт верифікований на телефоні, тому правити його без потреби — ризик.
2. **`btoa(String.fromCharCode(...new Uint8Array(buf)))`** у http-гілках парсерів — spread на великих
   масивах (2M+ елементів) дасть `RangeError`. На практиці не стріляє: http-гілка не використовується
   (файли приходять з document picker). Якщо колись додать завантаження по URL — робити чанками.

## 11. Локальна gradle-збірка — НЕ працює в цьому середовищі (перевірено 2026-10-26)

`./gradlew :app:assembleRelease` (у WSL, проєкт на `/mnt/c`) падає 3-ма спробами:
- `Failed to release lock on Build Output Cleanup Cache / executionHistory` (9p/drvfs не відпускає
  Gradle file-locks); прибирання `*.lock` і `--no-build-cache` не допомогло.
- Після 59 хв — процес впав без повідомлення про помилку; у логах `Hard link ... failed. Doing a slower
  copy instead` (9p не підтримує hard-link) → C/C++ компіляція на порядки повільніша.
- Пам'ять WSL: 7.8 GiB; gradle `-Xmx4096m` + kotlin daemon `-Xmx4096m` = 8 GiB → можливий OOM.

**Що це НЕ зачіпає:** EAS cloud build (виконує компіляцію на серверах Expo, не на `/mnt/c`) — це
штатний і ЄДИНИЙ рекомендований шлях (`HANDOFF.md` правило 1). EAS-блокер знято 2026-10-26.
**Маніфестна перевірка (AdMob ID + схема) виконана окремо** через `processReleaseManifest` — вона
успішна і не потребує повної збірки.

**Висновок:** не тратити час на локальний `assembleRelease`. Брати APK/AAB з EAS.

## 12. Play compliance — виправлено 2026-10-26 (перевірка claim'ів проти коду)

Запит «чи правда те, що ми обіцяємо» — по кожному пункту store listing.

| Claim | Код | Висновок |
|---|---|---|
| 44 цільові мови | `utils/languages.ts` = 45 записів − `auto` | ✅ точно 44 |
| Day / Night / Blackout | `themes.ts` day/night/blackout | ✅ |
| Speed reading | `screens/SpeedReadingScreen.tsx` | ✅ |
| TTS | `expo-speech` у ReaderScreen + DictionaryScreen | ✅ |
| EPUB/FB2/MOBI/DOCX/ODT/RTF/HTML/TXT/ZIP | 8 парсерів + TXT inline | ✅ |
| FSRS | власний рушій | ✅ |
| **«No tracking»** | — | ❌ **НЕПРАВДА** → виправлено: «No account, no login, no server of our own. Ads are served by Google AdMob». Обіцянка «no tracking» при живому AdMob = ризик відхилення |
| **Sentry «no-op»** | не встановлено, не імпортовано (dead code) | ❌ **НЕПРАВДА** → рядок прибрано з privacy policy; заявлено «стороння аналітика відсутня» |
| «функція очищення в налаштуваннях» | фактично `DictionaryScreen` → `clearAll` | ⚠️ уточнено в privacy policy |
| Донат через NOWPayments | `services/donate.ts` → **placeholder URL** | ❌ **МЕРТВЕ ПОСИЛАННЯ** (перевірено: JS-оболонка NOWPayments, сторінки донату нема) → додано в `PUBLISHING.md` як обов'язкову передумову |

**Принцип:** у Play не обіцяють те, чого нема в коді, і не замовчують те, що є. Розбіжність між
лістингом і реальністю — це не «дрібниця», а підстава для відхилення чи блокування акаунта.
Тому кожен claim перевіряється грепом по коду, а не «на око».

## 13. `SYSTEM_ALERT_WINDOW` у маніфесті — ПРИБРАНО (2026-10-26)

**Симптом:** у merged release-маніфесті був `android.permission.SYSTEM_ALERT_WINDOW`, якого немає
в `app.config.js` (`permissions: []`) і який ніхто не використовує. Play вважає цей дозвіл чутливим
(потребує виправдання ключовою фічею) → ризик додаткового рев'ю/відхилення.

**Корінь:** `expo prebuild` використовує шаблон
`@expo/config-plugins/build/plugins/withAndroidBaseMods.js` → `getAndroidManifestTemplate()` з
комментарем `<!-- OPTIONAL PERMISSIONS, REMOVE WHATEVER YOU DO NOT NEED -->`. Шаблон **завжди**
містить `INTERNET`, `SYSTEM_ALERT_WINDOW`, `VIBRATE`, `READ/WRITE_EXTERNAL_STORAGE`.

**Чому `android.permissions` не допомагає:** поле `permissions` у конфізі **додає** до шаблону,
а не замінює його. Перевірено емпірично: з `permissions: [5 дозволів]` у маніфесті лишились усі 5
+ `SYSTEM_ALERT_WINDOW`.

**Фікс:** config plugin `plugins/withRemoveSystemAlertWindow.js` (`withAndroidManifest` → видалити
`uses-permission` з `android:name="android.permission.SYSTEM_ALERT_WINDOW"`). Підключено в
`app.config.js` plugins. Перевірено: `grep -c SYSTEM_ALERT_WINDOW` на merged release-маніфесті = **0**.

**Принцип:** шаблон генератора — це не «наша конфігурація». Усе, що генерується, треба читати
і звіряти з тим, що реально потрібно; «дефолт фреймворку» часто містить зайве (дозволи, залежності,
конфіги). Маніфест — джерело правди для Play, не конфіг.





