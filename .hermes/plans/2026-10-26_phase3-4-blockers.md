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

## 3. БЛОКЕР 2 — EAS projectId вказує на СТАРИЙ проєкт (критично, ламає КОЖЕН білд)

`app.config.js:33` → `extra.eas.projectId = 59123992-8765-4762-87a4-9449c7384d79`

Доведено:
- EAS API: проєкт `59123992` має slug **`bookreader`** (старий) → `eas build:list` падає:
  `Slug for project identified by "extra.eas.projectId" (bookreader) does not match the "slug" field (sapphire)`.
- Проєкт `c6014b22-df9e-464c-903c-ffa9a5793249` (значення з brief) — **існує, але НЕ доступний** аккаунту `mike4224`
  (`Entity Not Authorized: AppEntity[c6014b22-…]`).
- **EAS НЕ резолвить проєкт по slug.** Потрібен явний `projectId`. (Перевірено: probe-проєкт з `app.json` slug=sapphire → "EAS project not configured".)
- **EAS-акаунт — `mike4224`** (не `mike2424`, як у brief). `eas whoami` → mike4224 / 402035zombie@gmail.com.
- Акаунти, в яких можна створювати проєкти: `mike4224`, `mike4224s-team`.

**Рішення користувача (2026-10-26):** перейменувати slug проєкту `59123992` з `bookreader` → `sapphire`
в EAS dashboard (зберігає build-історію). Точні кроки — у `PUBLISHING.md`, розділ 7.
Перейменування НЕ вимагає правок коду: `app.config.js` уже має і правильний `extra.eas.projectId`,
і правильний `slug: "sapphire"`.

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
