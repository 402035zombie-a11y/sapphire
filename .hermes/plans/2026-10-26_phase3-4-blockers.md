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

**Рішення (на вибір користувача):**
- (A) В EAS dashboard перейменувати slug проєкту `59123992` з `bookreader` → `sapphire` (зберігає build-історію).
- (B) Створити новий проєкт: `eas init --account mike4224` у корені Sapphire, вписати виданий ID в `app.config.js`.
- Після цього: `npx tsc --noEmit` → commit → build.

## 4. БЛОКЕР 3 — privacyPolicyUrl веде в 404 (репо private + безкоштовний GitHub)

- `app.config.js:9` → `https://402035zombie-a11y.github.io/sapphire/docs/privacy-policy.html` → **HTTP 404** (перевірено curl).
- GitHub API: репо `402035zombie-a11y/sapphire` = **`"private":true`**, `"has_pages":false`; аккаунт `"plan": null` (безкоштовний).
- **GitHub Pages на private-репо без платного плану неможливий.** Play Console вимагає ЖИВИЙ URL політики.
- Файл політики готовий: `docs/privacy-policy.html` (4045 B).

**Рішення (на вибір користувача):**
- (A) Окремий **публічний** репо (напр. `402035zombie-a11y/sapphire-privacy`) + Pages → URL `/sapphire-privacy/`. Основний репо лишається private.
- (B) Зробити `sapphire` публічним (відкриває код).
- (C) Безкоштовний статичний хостинг (Netlify / Vercel / Cloudflare Pages).

## 5. Додаткові ризики (не блокують, але фіксати)

1. **APK не містять AdMob ID.** У ВСІХ APK в `artifacts/apks/` (Oct 21–23) `aapt2` показує
   `com.google.android.gms.ads.APPLICATION_ID` = `""` (краш `MobileAdsInitProvider: Invalid application ID`).
   Але фікс (`app.json` з `android_app_id`, коміт `88a1c9b` 2026-10-23 **23:38**) з’явився ПІСЛЯ останнього APK
   (`build-1792778033289.apk`, Oct 23 **20:53**). Тобто фікс у коді Є, але **ніколи не перевірений у збірці**.
   Очікувана логіка: `react-native-google-mobile-ads/android/build.gradle:104` ставить
   `manifestPlaceholders = [appJSONGoogleMobileAdsAppID: <з app.json>]`, а `app-json.gradle` шукає `app.json`
   на рівень вище `android/` → `C:\Users\DELL\Sapphire\app.json` ✅ (tracked).
   **Обов'язкова перевірка після першої перезбірки:** `aapt2 dump xmltree --file AndroidManifest.xml <apk> | grep APPLICATION_ID`
   → value має бути `ca-app-pub-5113967448800652~8371247908`.
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

## 7. Наступні кроки (коли користувач прийме рішення)

1. **Телефон:** USB → `adb devices` → перезбірка release APK → `pm install -r -t` → MIUI-гранти → чекліст Фази 3.
2. **EAS:** вибрати (A)/(B) з п.3 → виправити `app.config.js` → commit → `eas build --profile preview`.
3. **Privacy:** вибрати (A)/(C) з п.4 → задеплоїти → перевірити HTTP 200 → оновити `privacyPolicyUrl`.
4. **Перезбірка:** `aapt2` на новому APK (AdMob value + `exp+sapphire://` scheme).
5. **Play:** Content Rating + Data Safety (веб-форми), скріншоти, feature graphic (1024×500 — `docs/sapphire-feature-graphic.png`), AAB.

## 8. Команди

```bash
cd /c/Users/DELL/Sapphire
npx tsc --noEmit
node scripts/test-parsers-runner.js
adb devices
aapt2 dump xmltree --file AndroidManifest.xml <apk> | grep APPLICATION_ID   # /c/Users/DELL/AppData/Local/Android/Sdk/build-tools/36.0.0/aapt2
wsl.exe -e bash -lc 'cd /mnt/c/Users/DELL/Sapphire && export ANDROID_HOME=/opt/android-sdk ANDROID_SDK=/opt/android-sdk JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 && eas build --profile preview --platform android --non-interactive --no-wait'
```
