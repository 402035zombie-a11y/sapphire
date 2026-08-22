# BookReader — HANDOFF (передача роботи другому агенту)

**Дата:** 2026-08-16 | **Гілка:** `fix/ui-bugs` | **Останній коміт:** `8d612e1`

## Статус проекту
BookReader — Expo RN (Hermes) e-book reader з перекладом. Мета: безкоштовний, UA-центричний, естетика "смак багатства" (графіт + помаранчевий). Зараз у стані активної розробки UI/багів на телефоні (S200 Plus, Android, dev-client через Metro :8081).

## ЩО ВИКОНАНО (цей раунд, коміти на гілці)

| # | Задача | Коміт | Статус |
|---|--------|-------|--------|
| 1 | Нарізка по реченнях (`splitIntoSegments` не ріже по `\n` wrap) | `b698a5a` | ✅ |
| 2 | Переклад per-sentence (`sentenceTranslations` map, без нашарування) | `b698a5a` | ✅ |
| 3 | Letter spacing (0..6px) у FontSettingsSheet | `b698a5a` | ✅ |
| 4 | Support modal: 30с перший, 5хв потім | `c71b0ac` | ✅ |
| 5 | Обкладинки (epub cover extraction → BookList Image) | `57eeacc` | ✅ |
| 6 | Видалення пошуку в Library | `fdfec46` | ✅ |
| 7 | Меню налаштувань: speak/translate приховані в read режимі | `3da5874` | ✅ |
| 8 | Білі кнопки (delete X тепер `neu.dark`) | `9501b89` | ✅ |
| 9 | Blackout тема (OLED #000000) | `9501b89` | ✅ |
| 10 | Icon SVG color fix (currentColor працює) | `8d612e1` | ✅ |
| 11 | Translation key fix (`p.index*1000+si` уніфіковано) | `8d612e1` | ✅ |

## АКТИВНІ БАГИ / НЕДОПРАЦЬОВАННЯ

### КРИТИЧНІ (треба перевірити/фіксити):
1. **Переклад "не відповідає тексту"** — ВИПРАВЛЕНО в `8d612e1` (key mismatch `i` vs `p.index`). ПОТРІБНА верифікація на живому скріншоті dual режиму (користувач скаржився, що переклад не співпадає з оригіналом). Build56 готовий, треба відкрити Alice dual і перевірити.
2. **Blackout: білий текст "5" у cover-квадраті (БАГ!)** — Pixel-аналіз показав R=245 G=245 B=245 (чистий білий) на "5" у зеленому квадраті BookList карток. `BookList.tsx` `coverText` змінено на `#B8B4AC` вручну, АЛЕ pixel все ще білий → АБО build57 не містить зміну (Metro cache?), АБО є інше джерело білого "5" (можливо `counterBadge` в TrainingScreen, але це Library скрін). ТРЕБА знайти і виправити. Робити pixel-аналіз через Python (PIL) для об'єктивності, НЕ vision_analyze (він бреше про кольори).
3. **Blackout: білі кольори (IN PROGRESS)** — Вручну виправлено в: BookList, LibraryScreen, IconButton, Button, FontSettingsSheet (chipText + slider thumbColor), DictionaryScreen (Delete/Add/plus/exportText), TrainingScreen (btnText + sourceTabText), SpeedReadingScreen (Select book/play/Yes), AppSettingsModal. tsc чистий, build57 SUCCESSFUL. Залишилось перевірити pixel-аналізом що НІДЕ немає білого (див. баг #2).

### СЕРЕДНІ:
4. **Обкладинка Alice не показується** — Gutenberg epub може не мати `cover-image` item у manifest. `parseEpub` шукає `Properties="cover-image"` або id містить "cover". Якщо книга не має cover → BookList показує літеру (це ок). Можна додати fallback: перший xhtml як cover.
5. **Prefetch перекладу при швидкому свайпі** — далекі блоки можуть не мати перекладу (lazy). Це не баг, а latency. Перевірити чи prefetch встигає.

### МАЙБУТНЄ (не в цьому раунді):
6. **Production APK/AAB через EAS** — Windows локальний build падає, треба WSL. `eas env:set` тільки `--name/--value`. AdMob IDs в EAS env (не в git).
7. **targetLang uk→en баг** — перевірити чи переклад працює в обидва боки.
8. **Speed reading режим** — не тестувався в цьому раунді.

## ЯК ЗАПУСКАТИ / ПЕРЕВІРЯТИ

### Локальний dev-build (на телефоні):
```bash
cd C:/Users/DELL/BookReader
pkill -9 -f gradle
npx expo run:android   # build56 готовий в android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb reverse tcp:8081 tcp:8081  # Metro needed (airplane mode OFF)
adb shell am force-stop com.bookreader.app
adb shell monkey -p com.bookreader.app -c android.intent.category.LAUNCHER 1
```
Телефон: airplane OFF, Metro :8081 (curl http://localhost:8081 → 200).

### Скріншоти:
```bash
adb shell screencap -p /sdcard/x.png
adb pull /sdcard/x.png /tmp/x.png
```
Потім `vision_analyze` на /tmp/x.png. **НЕ вірити vision_analyze сліпо** — він плутає світло-сірий з білим, градієнт з плоским. Краще використовувати `getComputedStyle` через execute_code/terminal для об'єктивних замірів.

### Відкриття Alice в DUAL режимі (важливо!):
Модалка "How do you want to open the book?" → "With translation" на **Y≈533** (екран 2400px@2x). Tap: `adb shell input tap 540 533`. Якщо потрапляєш в plain режим — coords невірні.

## КЛЮЧОВІ ФАЙЛИ
- `utils/sentenceSplitter.ts` — `splitIntoSegments` (НЕ ріже по `\n` wrap)
- `screens/ReaderScreen.tsx` — `sentences` memo, `translateBatch` (per-sentence), `sentenceTranslations` key=`p.index*1000+si`
- `components/SentenceRow.tsx` — рендер речення + переклад (авто в dual)
- `store/libraryStore.ts` — `Book.sentenceTranslations`, `updateSentenceTranslations`
- `store/settingsStore.ts` — `reader.letterSpacing`, `theme`
- `theme/themes.ts` — `day`/`night`/`blackout` палітри
- `components/Icon.tsx` — SVG іконки, `color` prop → `currentColor`
- `components/FontSettingsSheet.tsx` — letterSpacing stepper, theme picker
- `hooks/useSupportAutoOpen.ts` — 30с/5хв таймінг support modal

## КОНФІГУРАЦІЯ
- Expo SDK 54, RN 0.81.5, NewArch, reanimated 4.1.1
- expo-sqlite 15.2.14, mmkv 3.3.3
- AdMob: `react-native-google-mobile-ads@15.4.0`, IDs в EAS env (НЕ в git)
- GitHub: `402035zombie-a11y/bookreader`, гілка `fix/ui-bugs`
- EAS account: `mike4224`, token в `C:\Users\DELL\Desktop\brbrbr.txt`
- Privacy Policy: https://raw.githubusercontent.com/402035zombie-a11y/bookreader/fix/ui-bugs/docs/privacy-policy.html

## ПРАВИЛА (memory)
- АВТОНОМНІСТЬ: "НЕ ПИТАЙ ДОЗВОЛУ - РОБИ!" — рішай баги по черзі, пауза тільки на архітектурних розвилках.
- Якщо агент вимикає airplane mode (для adb install) → після встановлення УВІМКНУТИ назад.
- Перед новим build — `pkill -9 -f gradle`.
- Обкладинки: Book.coverImage (base64), BookList рендерить <Image> якщо є.
- Переклад: splitIntoSegments → per-sentence, key = paragraphIndex*1000 + sentenceIndex.
- Vision_analyze НЕ надійний для кольорів — використовуй getComputedStyle.
- Context cliff: якщо розмова довга — починай новий чат, offload в plan файли.
- Субагенти: користувач велів використовувати delegate_task для паралельної роботи.
