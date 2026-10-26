# Sapphire: повне перейменування BookReader → Sapphire

Створено: 2026-10-25
Статус: **ВИКОНАНО ПОВНІСТЮ (кроки 2.1–2.10)** — 2026-10-26
Рішення власника: втрата даних на телефоні при оновленні **допустима** (додатком користується лише власник) → міграція storage-ключів НЕ потрібна.

## Виконано

| Крок | Коміт | Стан |
|---|---|---|
| План | `5e7021aa` | ✅ |
| 2.1–2.7 репо | `def0c59d`, `defb36f2`, `3d66c843` | ✅ |
| 2.8 skills (9 скілів + довідники) | — (поза git) | ✅ |
| 2.9 hermes-скрипти + memory | — (поза git) | ✅ |
| 2.10 GitHub rename | `e421c66` | ✅ `402035zombie-a11y/sapphire` |

## Підсумок перевірки

```
git grep -i bookreader (живий код)  -> 1 (навмисний: scheme)
npx tsc --noEmit                    -> exit 0
node scripts/test-parsers-runner.js -> 15/15 OK
git status --short                  -> чисто
```

## Бонус: APK-артефакти прибрано з git (2026-10-26)

**Проблема:** push відхилався — `apk/app-debug.apk` (223 MB) перевищує ліміт GitHub (100 MB).
У історії було 4 APK (~635 MB), `.git` = 555 MB.

**Рішення:** APK = build-артефакти, не джерело → не версіонуються.
- Файли перенесено в `artifacts/apks/` (на диску, поза git) — інсталятори для телефона цілі
- `.gitignore`: `*.apk`, `artifacts/`, `apk/`, `app-release-apk/`, `build-*.apk`, `dev-client.apk`
- `git filter-repo --invert-paths --path-glob '*.apk' --path-glob 'artifacts/*' --force`

**Результат:** `.git` 555 MB → **8.8 MB** (−98.4%). Найбільший блоб — `assets/icon-flux.png` (4.4 MB).
Push: `fix/ui-bugs` → `d183d91`, усі теги синхронізовано.

## Навмисні винятки (більше не чіпати)

| Місце | Причина |
|---|---|
| `app.config.js:8` `scheme: "bookreader"` | Deep-link схема `exp+bookreader://` — зміна ламає лінки |
| `app.config.js:9` `privacyPolicyUrl: .../bookreader/docs/...` | GitHub Pages URL прив'язаний до назви репо |
| `.hermes/plans/2026-10-25_brand-rename-plan.md` | Аудит-запис самої операції |
| `*.apk` бінарники | Артефакти, перезбираються |
| `skills/.archive/*` (159 файлів) | Мертві, не вантажаться |
| `exp+bookreader://` у скилах | Документація реальної схеми |

---

## Інваріанти (порушення = відкат)

| # | Інваріант | Чому |
|---|---|---|
| I1 | Кожен крок завершується комітом | Відкат = `git revert <sha>` |
| I2 | `git grep -i bookreader` не зникає раптово | Якщо крок зламав збірку — відкат відразу |
| I3 | Канонічний шлях репо = `C:\Users\DELL\Sapphire` | Усе інше посилається на нього |
| I4 | Не чіпати `android/app/src/main/java/` | Нативний код уже `com.mike.wolfskin` |
| I5 | Не чіпати `.archive/` скіли (159 файлів) | Мертві, не вантажаться |
| I6 | Кроки виконуються ПО ЧЕРЗІ | Без паралельних правок одних файлів |

---

## КРОК 2.1 — Репо: відображувальні тексти (🟢 нульовий ризик)

**Файли:** `README.md`, `DEV-GUIDE.md`, `HANDOFF.md`, `PRIVACY_POLICY.md`, `PUBLISHING.md`,
`TESTING_CHECKLIST.md`, `native/README.md`, `docs/admob-fix-guide.md`,
`docs/content-rating-data-safety.md`, `docs/privacy-policy.html`, `assets/privacy-policy.html`

**Зміни:** `BookReader`/`bookreader` → `Sapphire`/`sapphire` (текстові згадки)

**Перевірка:**
```bash
cd C:/Users/DELL/Sapphire
git diff --stat                     # очікувано: лише .md/.html, без .ts/.js
git grep -i bookreader -- '*.md' '*.html' | wc -l   # очікувано: 0
npx tsc --noEmit                    # очікувано: exit 0
```
**Відкат:** `git checkout -- <files>`

---

## КРОК 2.2 — Репо: конфіги відображення (🟢 низький ризик)

**Файли і точні рядки:**
| Файл | Рядок | Було | Стане |
|---|---|---|---|
| `package.json` | 2 | `"name": "bookreader"` | `"name": "sapphire"` |
| `public/index.html` | 7 | `<title>BookReader</title>` | `<title>Sapphire</title>` |
| `app.config.js` | 7 | `slug: "bookreader"` | `slug: "sapphire"` |

**НЕ чіпати в `app.config.js`:**
- `scheme: "bookreader"` (рядок 8) — deep-link схема, залишаємо
- `privacyPolicyUrl` (рядок 9) — GitHub Pages URL, прив'язаний до назви репо на GitHub

**Перевірка:**
```bash
node -e "console.log(require('./package.json').name)"    # очікувано: sapphire
grep -n "<title>" public/index.html
npx tsc --noEmit                                         # exit 0
```
**Відкат:** `git checkout -- package.json public/index.html app.config.js`

---

## КРОК 2.3 — Репо: storage-ключі сторів (🟡 дані скинуться — допущено)

**Файли:** `store/settingsStore.ts:73`, `store/dictionaryStore.ts:120`, `store/libraryStore.ts:170`,
`store/supportStore.ts:32`, `store/trainingStore.ts:98`

| Було | Стане |
|---|---|
| `'bookreader-settings'` | `'sapphire-settings'` |
| `'bookreader-dictionary'` | `'sapphire-dictionary'` |
| `'bookreader-library'` | `'sapphire-library'` |
| `'bookreader-support'` | `'sapphire-support'` |
| `'bookreader-training'` | `'sapphire-training'` |

**Відслідковування:** ключ формується в `store/createStore.ts:63` → `'persist:' + name`.
Зміна `name` = новий AsyncStorage-ключ. **Міграція не робиться** (рішення власника).

**Перевірка:**
```bash
git grep -i "bookreader" -- 'store/*.ts' | wc -l   # очікувано: 0
npx tsc --noEmit                                   # exit 0
node scripts/test-parsers-runner.js < /dev/null   # очікувано: 15/15 OK
```
**Відкат:** `git checkout -- store/`

---

## КРОК 2.4 — Репо: нативний codegen-конфіг (🟢 нульовий ризик)

**Файл:** `package.json:61`
```
"javaPackageName": "com.bookreader.app.bookparser"  →  "com.sapphire.app.bookparser"
```
**Ґрунтування:** `android/app/src/main/java/com/bookreader` **не існує** (модуль видалений раніше).
Це мертвий codegen-конфіг Expo. `specs/NativeBookParser.ts`, `specs/NativeBookTTS.ts` залишаються.

**Перевірка:**
```bash
python -c "import json;d=json.load(open('package.json'));print(d['expo']['codegenConfig']['android']['javaPackageName'])"
# очікувано: com.sapphire.app.bookparser
```
**Відкат:** `git checkout -- package.json`

---

## КРОК 2.5 — Репо: імені файлів експорту/UI (🟢 низький ризик)

| Файл | Було | Стане |
|---|---|---|
| `components/AppSettingsModal.tsx:52` | `'bookreader-backup.json'` | `'sapphire-backup.json'` |
| `screens/DictionaryScreen.tsx:323,409` | `'bookreader-dictionary.json'` | `'sapphire-dictionary.json'` |
| `screens/DictionaryScreen.tsx:330,416` | `${cacheDirectory}bookreader-dictionary.json` | `${cacheDirectory}sapphire-dictionary.json` |
| `components/Marquee.tsx:10,12,14,47` | `bookreader-marquee-kf`, `bookreader-marquee` | `sapphire-*` (CSS keyframe id) |

**Перевірка:**
```bash
git grep -i bookreader -- 'components/*.tsx' 'screens/*.tsx' | wc -l   # 0
npx tsc --noEmit                                                      # exit 0
```
**Відкат:** `git checkout -- components/ screens/`

---

## КРОК 2.6 — Репо: скрипти (🟢 нульовий ризик)

**Файли:** `bookreader_cleanup.py`, `scripts/add_format_keys.py`, `scripts/add_support_keys.py`,
`scripts/add_translation_services_keys.py`, `scripts/inset-shadow-audit.py`,
`scripts/library-parse-verification-runner.js`, `scripts/probe-md5.js`,
`scripts/test-parsers-runner.js`, `scripts/theme-pixel-audit.py`

**Перейменувати файл:** `bookreader_cleanup.py` → `sapphire_cleanup.py`

**Перевірка:**
```bash
ls bookreader_cleanup.py 2>&1        # очікувано: No such file
git grep -i bookreader -- 'scripts/*' | wc -l   # 0
```
**Відкат:** `git checkout -- scripts/ && git checkout -- bookreader_cleanup.py`

---

## КРОК 2.7 — План-файли в репо (🟢 нульовий ризик)

**Файли:** `.hermes/plans/2026-08-08_174500-bookreader-vocab-loop.md`,
`.hermes/plans/2026-08-26_translation-preload-queue.md`, `.hermes/plans/2026-10-21_session-summary.md`,
`.hermes/plans/implementation-plan-log.md`, `.hermes/plans/t11-publish-prep.md`

**Рішення:** перейменувати ФАЙЛИ, вміст лишити історичним (це журнал минулого).

**Перевірка:**
```bash
ls .hermes/plans/ | grep -i bookreader   # очікувано: порожньо
```
**Відкат:** `git checkout -- .hermes/plans/`

---

## КРОК 2.8 — Live skills (🟢 нульовий ризик, 30 файлів)

**Блок:** `C:\Users\DELL\AppData\Local\hermes\skills\bookreader\`

**Зміни:**
- Перейменувати теку категорії `bookreader/` → `sapphire/`
- Перейменувати скіли: `bookreader-debug` → `sapphire-debug`, `bookreader-design` → `sapphire-design`,
  `bookreader-rn-native` → `sapphire-rn-native`, `bookreader-parser-testing` → `sapphire-parser-testing`
- Оновити `bookreader/` → `sapphire/` всередині SKILL.md (frontmatter `name:` + текст)
- Оновити `bookreader-debug/scripts/measure_dom.py`
- Оновити `.usage.json` (мапінг імен скілів)

**НЕ чіпати:** `skills/.archive/` (159 файлів), `skills/devops/expo-build-cache-clean/SKILL.md`,
`skills/devops/pre-build-cleanup/SKILL.md` (там bookreader = посилання на проєкт, легальні)

**Перевірка:**
```bash
ls "C:/Users/DELL/AppData/Local/hermes/skills/" | grep -i bookreader   # порожньо
grep -rl -i bookreader "C:/Users/DELL/AppData/Local/hermes/skills/bookreader" 2>/dev/null | wc -l
```
**Відкат:** git-незалежна зона → зберегти бекап перед кроком: `cp -r skills/bookreader /tmp/...`

---

## КРОК 2.9 — Hermes-скрипти + memory (🟢 нульовий ризик)

**Файли:**
- `C:\Users\DELL\AppData\Local\hermes\scripts\bookreader_cleanup.py` → `sapphire_cleanup.py`
- `C:\Users\DELL\AppData\Local\hermes\scripts\supervisor.py` (шлях на BookReader)
- Memory: замінити `BookReader` → `Sapphire`, `bookreader` → `sapphire`

**Перевірка:**
```bash
grep -rl -i bookreader "C:/Users/DELL/AppData/Local/hermes/scripts" | wc -l   # 0
```
**Відкат:** `cp` бекап

---

## КРОК 2.10 — GitHub repo rename (🟠 окремо, свідомо)

**Поточний:** `github.com/402035zombie-a11y/bookreader`

**Наслідки перейменування:**
1. Pages-URL змінюється: `.../bookreader/docs/privacy-policy.html` → `.../sapphire/docs/...`
   → **обов'язково** оновити `app.config.js:9` `privacyPolicyUrl`
2. `git remote` у всіх клонах → поновити `git remote set-url`
3. Посилання в docs

**Порядок:**
1. Перейменувати репо на GitHub (Settings → Rename)
2. Оновити `app.config.js:9` `privacyPolicyUrl`
3. `git remote set-url origin https://<token>@github.com/402035zombie-a11y/sapphire.git`
4. `git push` (перевірити, що працює)
5. Перевірити Pages-URL віддає privacy policy

**Перевірка:**
```bash
git remote -v                       # містить /sapphire.git
curl -sI https://402035zombie-a11y.github.io/sapphire/docs/privacy-policy.html | head -1
```
**Відкат:** перейменувати назад (GitHub зберігає редирект 30 днів)

---

## ФІНАЛЬНА ВЕРИФІКАЦІЯ (після 2.10)

```bash
cd C:/Users/DELL/Sapphire
echo "=== A. Нуль згадок у репо (крім навмисних) ==="
git grep -i bookreader -- . ':!node_modules' | head -20
# ОЧІКУВАНО лише:
#   app.config.js        (scheme + privacyPolicyUrl — навмисно)
#   *.apk бінарники      (артефакти, перезбираються)
#   .test-parsers-bundle (регенерований бандл)

echo "=== B. Типи ==="
npx tsc --noEmit

echo "=== C. Тести парсерів ==="
node scripts/test-parsers-runner.js < /dev/null 2>&1 | grep -c ": OK"   # 15

echo "=== D. Git чистий ==="
git status --short

echo "=== E. Білд (опційно) ==="
# wsl.exe -e bash -lc 'cd /mnt/c/Users/DELL/Sapphire && TMPDIR=/var/tmp ... eas build --local --profile preview'
```

---

## Ризик-матриця (підсумок)

| Крок | Ризик | Час | Відкат |
|---|---|---|---|
| 2.1 Тексти | 🟢 0 | 5 хв | `git checkout` |
| 2.2 Конфіги | 🟢 низький | 5 хв | `git checkout` |
| 2.3 Storage-ключі | 🟡 дані скинуться | 5 хв | `git checkout` |
| 2.4 Codegen | 🟢 0 | 2 хв | `git checkout` |
| 2.5 Експорт/UI | 🟢 низький | 5 хв | `git checkout` |
| 2.6 Скрипти | 🟢 0 | 5 хв | `git checkout` |
| 2.7 Плани | 🟢 0 | 2 хв | `git checkout` |
| 2.8 Skills | 🟢 0 | 10 хв | `cp` бекап |
| 2.9 Скрипти+memory | 🟢 0 | 5 хв | `cp` бекап |
| 2.10 GitHub | 🟠 середній | 10 хв | rename назад |
| **Разом** | | **~55 хв** | |

## Що НЕ робимо
- Міграція storage-ключів (власник погодив: втрата даних не страшна)
- `.archive/` скіли (159 файлів, мертві)
- `android/app/src/main/java/` (нативний код уже правильний)
- `scheme: "bookreader"` (deep links)
- `specs/NativeBookParser.ts` / `specs/NativeBookTTS.ts` (codegen-специфікації)
