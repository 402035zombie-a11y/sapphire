# SESSION SUMMARY — 2026-10-21 — T1–T12 COMPLETED

> **Статус:** 12/12 задач Kanban — DONE. Телефонна перевірка пройдена.
> **Проєкт:** Sapphire (BookReader) — `C:\Users\DELL\Sapphire`, branch `fix/ui-bugs`.
> **Пакет:** `com.mike.wolfskin`. **Телефон:** Xiaomi 23124RA7EO (`1d32a2e2`).

---

## 1. Що зроблено (T1–T12) — де і як

### T1 — Парсери всіх форматів ✅
- **Харнес:** `scripts/test-parsers-runner.js` (Babel → CommonJS → реальний код парсерів, без Metro/телефона).
- **Фікстури:** `data/test_files/` — rtf.w1252.rtf, fb2.min.fb2, mobi.min.mobi, docx.min.docx, odt.min.odt,
  html.min.html, epub.min.epub, nested.zip.
- **Виправлено в харнесі:**
  - `makeMobi` — PalmDOC header offsets: `compression=1 @8`, `textLength @12`, `recordCount=1 @16`, `recordSize @18`.
    Було: `Unknown MOBI compression: 256`. Production `services/mobiParser.ts` НЕ чіпали — він читав правильно.
  - RTF-виклик: `parseRtfFromBytesRaw` → `parseRtfFromBytes` + додано `await` (був Promise → `parsed.text === undefined`).
  - Точне копіювання буферів: `txt.buffer.slice(txt.byteOffset, txt.byteOffset + txt.length)`.
- **Результат:** 8 форматів PASS, U+FFFD = 0. Win1252: усі 26 байтів 0x80–0x9F коректні.

### T2 — TypeScript ✅
- `npx tsc --noEmit` → exit 0. Кілька разів (після кожної зміни).

### T3–T8, T10 — Телефонна перевірка ✅
- **Підготовка:** `npx expo start --host localhost` (порт 8081), `adb reverse tcp:8081 tcp:8081`,
  deep link `exp+bookreader://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081`.
- **Метод:** `adb shell uiautomator dump` → парс XML → координати → `adb shell input tap`.
  Скріни агент не робив; перевірка через UI-дампи + піксель-аудит (PIL).
- **Докази:**
  - T3: Library — 5 карток (MOBI/FB2/EPUB/RTF/HTML), `MOBI · AUTO → UK`.
  - T4: пікселі — Day `#EAD9BE`, Night `#1C1D21`, Blackout `#050505` (flat, без прозорості).
  - T5: MOBI читається (курсивні лапки, сегментація речень), модалка режимів (3 варіанти),
    тап по слові → WordBottomSheet «along» → «разом» → «✓ In dictionary».
  - T6: словник — 15077 сл., 12 відповідей (✓4/✗8), фільтри Sort/Type/Due, UA-переклади.
  - T7: тренування — 4 режими (Multiple choice / Type / True-False / Fill the blank), Daily goal 0/10.
  - T8: i18n — 43 мови, перевірено юзером на телефоні.
  - T10: AppSettingsModal — Theme (Day/Night/Blackout), App language, Export backup JSON.

### T9 — Монетизація ✅ (code/config)
- AdMob реальні ID у 5 місцях: `.env`, `eas.json`, `app.config.js`, `AndroidManifest.xml`, debug bundle.
  App `~8371247908`, Banner `/4712038644`, Rewarded `/1663349260`. Тестові ID (`ca-app-pub-394...`) — тільки в моках.
- `react-native-google-mobile-ads` plugin **видалено** з `plugins` (несумісний з expo 54 / eas-cli 22),
  замість нього `expo-build-properties` з хардкодованим `meta-data`.
- Donate: `expoConfig.extra.donateUrl` → `https://nowpayments.io/donation/sapphire-reader`.

### T11 — Publish prep ✅ (code/config)
- Privacy policy: реальний email `402035zombie@gmail.com` у `PRIVACY_POLICY.md` + `docs/privacy-policy.html`.
  `privacyPolicyUrl` → `https://402035zombie-a11y.github.io/bookreader/docs/privacy-policy.html`.
- Іконки: `assets/icon.png` 1024, `adaptive-icon.png` 432, `icon-play-512.png` 512.
- Feature graphic: `docs/sapphire-feature-graphic.png` 1024×500.
- Content rating / Data Safety: `docs/content-rating-data-safety.md`.
- **AAB НЕ зібрано** (EAS free quota / upload error).

### T12 — Лог ✅
- Цей файл + `.hermes/plans/implementation-plan-log.md` + `.hermes/plans/t11-publish-prep.md` + `HANDOFF.md`.

---

## 2. Змінені / створені файли

### Змінені (tracked)
| Файл | Що |
|---|---|
| `app.config.js` | `privacyPolicyUrl` → GitHub Pages URL |
| `docs/privacy-policy.html` | placeholder email → `402035zombie@gmail.com` |
| `PUBLISHING.md` | кроки публікації, EAS status, реальні ID |
| `package.json` | `expo-dev-client` → devDependencies |
| `package-lock.json` | синхронізовано з package.json |
| `HANDOFF.md` | стан на 2026-10-21 + телефонні докази |
| `KANBAN_DETAILED.md` | статус-шапка |

### Створено (untracked)
| Файл | Призначення |
|---|---|
| `.hermes/plans/implementation-plan-log.md` | головний лог T1–T12 |
| `.hermes/plans/t11-publish-prep.md` | план публікації |
| `.hermes/plans/2026-08-26_translation-preload-queue.md` | оновлено статусом сесії |
| `.hermes/plans/2026-10-21_session-summary.md` | цей файл |
| `scripts/test-parsers-runner.js` | харнес парсерів |
| `scripts/library-parse-verification-runner.js` | допоміжний runner |
| `scripts/theme-pixel-audit.py` | піксель-аудит тем |
| `scripts/inset-shadow-audit.py` | аудит вставних тіней |
| `scripts/probe-*.js`, `scripts/test-import.js` | діагностика |
| `scripts/verify_*.mjs` | перевірки Anki/фільтрів/перекладів |
| `services/i18n.ts` | shim для Node-тестерів |
| `docs/content-rating-data-safety.md` | чек-ліст Play Console |
| `ui*.xml` (13) | UI-дампи з телефона |
| `theme_*.png`, `sapphire1.png`, `lib_check.png` | скріншоти |
| `.test-parsers-bundle/` | збірки парсерів (build-артефакт) |

---

## 3. Git-стан
- Branch `fix/ui-bugs`, **6 комітів попереду** origin (до push).
- Останні: `70756b0c` RTF byte-level parsing + LanguageDropdown scroll + SpeedReading ticker,
  `28d1dab2` внутрішні тіні в білій темі (shadowLight 0.45→0.7), `121bbb36` прибрано Web Worker.
- 5 modified + 97 untracked (переважно артефакти перевірки).

---

## 4. Технічні уроки (не повторювати)

1. **Hermes не підтримує `import.meta.url`** → Web Worker неможливий. Парсери = main thread + `await setTimeout(0)` yield.
2. **Node ESM не тягне bare-dir import `../i18n`** → shim `services/i18n.ts`.
3. **RTF `\'hh` = Windows-1252**, не Unicode. `String.fromCharCode(0x93)` → контрольний символ, не `"`.
   Потрібен мапінг Win1252→Unicode (0x93→U+201C і т.д.). Парсер читає байти (`Uint8Array`), не UTF-8 рядки.
4. **MOBI fixture** — проблема була в тестовому генераторі, не в production-парсері.
5. **Android + inset boxShadow** не рендериться → вдавленість = кольоровий бордер (dark top/left, light bottom/right) + `elevation: 0`.
   **НЕ** додавати `shadowRadius`/`shadowOpacity` (це дає рівномірний ореол, не лунку).
6. **Blackout = FLAT**: 0 прозорості, фон surface, бордер кольору тексту. Перевірено піксельно: `#050505`.
7. **Точка входу Metro** — `node_modules/expo/AppEntry.js` (файлу `index.js` у проєкті немає).
8. **Deep link dev-client** працює краще за ручний вибір у Dev Menu:
   `adb shell am start -a android.intent.action.VIEW -d "exp+bookreader://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"`
9. **uiautomator dump** — надійніший спосіб читати UI телефона без скріншотів.

---

## 5. Що залишилось для публікації

| # | Крок | Команда / дія | Блокер |
|---|---|---|---|
| 1 | `git add` + commit змін | `git add -A` (після `.gitignore` для артефактів) | — |
| 2 | Push | `git push origin fix/ui-bugs` | 6 комітів чекають |
| 3 | GitHub Pages | Увімкнути Pages на `402035zombie-a11y/bookreader` (branch `fix/ui-bugs` / `main`, folder `docs` або `/docs`) | Ручна дія в UI |
| 4 | Перевірити privacy URL | `curl -I https://402035zombie-a11y.github.io/bookreader/docs/privacy-policy.html` | Після Pages |
| 5 | Production AAB | `EAS_NO_VCS=1 eas build --profile production --platform android` | EAS free quota |
| 6 | Screenshots | Зібрати з телефона: Library, Reader, Dictionary, Training (1080×1920+) | Потрібні 2+ скріни |
| 7 | Play Console | Create app → upload AAB → Content Rating + Data Safety (за `docs/content-rating-data-safety.md`) | Ручна дія |
| 8 | Submit | `eas submit --platform android` або через Play Console | Після 5–7 |
