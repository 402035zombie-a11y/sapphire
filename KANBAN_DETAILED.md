# КАНБАН — ФІКС БАГІВ UI BookReader (після білда, ДО наступного білда)

Статус: усі баги фіксимо в коді → **ОДИН білд у кінці**. Білди між фіксами ЗАБОРОНЕНО (вказівка користувача 2026-08-14).
Верифікація: `npx tsc --noEmit` після кожного файлу + `expo start --web --port 8082` (користувач перевіряє в браузері).
Гілка: `fix/ui-bugs`. Файли: `components/`, `screens/`, `services/`, `theme/`.

## Етап 0 — ПІДГОТОВКА [DONE]
- [x] 0.1 `npx tsc --noEmit` — перевірити базовий стан (EXIT 0 на старті).
- [x] 0.2 Перевірити `react-native-safe-area-context` встановлено (INSTALLED).
- [x] 0.3 `git checkout -b fix/ui-bugs` — створити гілку.
- [x] 0.4 Запустити `expo start --web --port 8082` у фоні для верифікації.

## Етап 1 — T13: видалити старий пункт мови [DONE]
- [x] 1.1 Відкрити `components/FontSettingsSheet.tsx`.
- [x] 1.2 Знайти блок `mode === 'dual'` + `LanguagePicker` (рядки ~221–242).
- [x] 1.3 Видалити блок dropdown "Translation language".
- [x] 1.4 Видалити `LanguagePicker` (рядки 221–228) — більше не використовується.
- [x] 1.5 Видалити `const [langPicker, setLangPicker]` (рядок 85).
- [x] 1.6 Видалити імпорти `LanguagePicker`, `langName`, `translatableLangs` (рядки 16–17).
- [x] 1.7 `npx tsc --noEmit` → перевірити (була тимчасова помилка зайвого `</View>`, виправлено).
- [x] 1.8 Закомітити: "fix(T13): remove legacy translation-language picker from FontSettingsSheet".

## Етап 2 — T12: текст без пробілів + underline [DONE]
- [x] 2.1 Відкрити `components/SentenceRow.tsx`.
- [x] 2.2 Знайти `renderToken` (рядок ~107–111), блок `if (isWord)`.
- [x] 2.3 Додати `{' '}` після `{tok}` у `<Text>` → `"{tok}{' '}"` (гарантує пробіл між словами).
- [x] 2.4 Знайти `styles.tapWord` (рядок ~169).
- [x] 2.5 Прибрати `textDecorationLine: 'underline'` + `textDecorationColor` (залишити `fontFamily`).
- [x] 2.6 `npx tsc --noEmit` → EXIT 0.
- [x] 2.7 Закомітити: "fix(T12): add word spacing + remove underline in SentenceRow".

## Етап 3 — T3: safe-area top усі екрани [DONE]
- [x] 3.1 Відкрити `theme/useAdaptive.ts`.
- [x] 3.2 Імпорт `useSafeAreaInsets` з `react-native-safe-area-context`.
- [x] 3.3 У `useAdaptive()`: `const insets = useSafeAreaInsets();`.
- [x] 3.4 Додати `insetTop: number` в інтерфейс `Adaptive`.
- [x] 3.5 Додати `insetTop: insets.top` у повернення об'єкта.
- [x] 3.6 Відкрити `components/Screen.tsx` — замінити `StyleSheet.create` на inline style у компоненті: `paddingTop: a.insetTop` (бо `a` недоступне в StyleSheet.create поза функцією).
- [x] 3.7 `screens/ReaderScreen.tsx` header: `paddingTop: a.insetTop + (a.landscape ? 6 : 10)`.
- [x] 3.8 `screens/TrainingScreen.tsx`: `container` +`paddingTop: a.insetTop + a.pad`; `startScroll` +`a.insetTop`.
- [x] 3.9 `screens/LibraryScreen.tsx`: `libHead` `top: a.insetTop + a.pad`; `list` `paddingTop: a.insetTop + a.pad + ...`.
- [x] 3.10 `screens/DictionaryScreen.tsx`: `headerRight` View +`paddingTop: a.insetTop`.
- [x] 3.11 `npx tsc --noEmit` → EXIT 0 (фільтрувати node_modules-шум).
- [x] 3.12 Закомітити: "fix(T3): add safe-area top inset to all screens".

## Етап 4 — T45: ModalSheet центрування + overflow/nested [DONE]
- [x] 4.1 Відкрити `components/ModalSheet.tsx`.
- [x] 4.2 Додати проп `allowNested = false` (тип + дефолт).
- [x] 4.3 У панелі: `overflow: allowNested ? 'visible' : 'hidden'` (дозволяє вкладені не обрізатися).
- [x] 4.4 Кореневий View: замінити `paddingTop: a.pad` на `paddingVertical: a.pad` (симетрія → гарантований центр).
- [x] 4.5 Відкрити `components/LanguagePicker.tsx`.
- [x] 4.6 Додати проп `embedded?: boolean` (тип + дефолт false).
- [x] 4.7 Винести контент у `const content = (...)` (без ModalSheet).
- [x] 4.8 `if (embedded) return visible ? content : null;` — інакше обгортати в ModalSheet.
- [x] 4.9 Відкрити `components/AppSettingsModal.tsx`.
- [x] 4.10 `<ModalSheet ... allowNested>` + `<LanguagePicker ... embedded />` (рядок ~116).
- [x] 4.11 `npx tsc --noEmit` → EXIT 0.
- [x] 4.12 Закомітити: "fix(T45): ModalSheet centering + allowNested + embedded LanguagePicker".

## Етап 5 — T1: Training input не активне [DONE — best-effort]
- [x] 5.1 Відкрити `components/ui/TextField.tsx` — переконатися `forwardRef` + `...rest` (вже є).
- [x] 5.2 `screens/TrainingScreen.tsx`: знайти `useEffect` з `setTimeout(() => typeInputRef.current?.focus(), 50)` (рядок ~262).
- [x] 5.3 Замінити на `requestAnimationFrame` + cleanup `cancelAnimationFrame`.
- [x] 5.4 У `<TextField>` додати `editable={!typeChecked}` + `returnKeyType="done"` (вже було editable, додано returnKeyType).
- [x] 5.5 `npx tsc --noEmit` → EXIT 0 (прибрано помилковий `keyboardShouldPersistTaps` з TextInput).
- [x] 5.6 Закомітити: "fix(T1): reliable focus on Training type input".
- [ ] 5.7 [VERIFY] Користувач має перевірити в браузері/телефоні чи поле фокусується (best-effort, може потребувати скрін).

## Етап 6 — T2: EPUB/TXT імпорт [DONE]
- [x] 6.1 Відкрити `services/txtParser.ts` — `FileSystem.readAsStringAsync` deprecated+throws.
- [x] 6.2 Замінити на `const res = await fetch(uri); const raw = await res.text();` (expo fetch polyfill підтримує file://).
- [x] 6.3 Відкрити `services/epubParser.ts` — `fetch(uri).arrayBuffer()` (рядок 64) залишити (працює на native через expo polyfill; помилка була у txtParser, не тут).
- [x] 6.4 Відкрити `services/fb2Parser.ts` — вже використовує `fetch(uri).text()` (рядок 60), ОК.
- [x] 6.5 `npx tsc --noEmit` → EXIT 0 (фільтрувати node_modules-jszip/expo-modules-core pre-existing).
- [x] 6.6 Закомітити: "fix(T2): migrate txt import from deprecated readAsStringAsync to fetch".

## Етап 7 — T678: Library modal + Settings X + z-index [DONE]
- [x] 7.1–7.9 ModalSheet центрує (justifyContent:center, variant center дефолт); AppSettingsModal X у top/right zIndex:20 (не перекриває список — заголовок окремий row); SupportAuthorModal zIndex:1000 (не конфліктує, різні екрани). Закрито в 2adf1e9/d8013e9.

## Етап 8 — T11: SupportAuthorModal центрування [DONE]
- [x] 8.1–8.5 ModalSheet justifyContent:center центрує панель. Закрито в 2adf1e9.

## Етап 9 — T10: AddWordModal (DictionaryScreen) [DONE]
- [x] 9.1–9.6 ModalSheet центрує AddWordModal; поле searchInline minWidth збільшено; KeyboardAvoidingView не потрібен (ModalSheet оверлей). Закрито в 2adf1e9/d8013e9.

## Етап 10 — RED: червоний текст на localhost:8082 [DONE — не існує]
- [x] 10.1–10.4 Користувач підтвердив RED (targetLang undefined у LibraryScreen:501) → виправлено `(item.targetLang ?? item.language).toUpperCase()`, закомічено 81dd9dd. RED зник після перевірки у браузері. Білд дозволено.

## Етап 11 — ФІНАЛЬНИЙ БІЛД [IN PROGRESS]
- [ ] 11.1 `git status` — всі фікси в гілці fix/ui-bugs.
- [ ] 11.2 `npx tsc --noEmit` → EXIT 0.
- [x] 11.3 `eas build --profile preview --platform android` (WSL cloud, Kotlin 2.3.0 прибрано → 15.4.0 AdMob OK).
- [ ] 11.4 Дати користувачу лінк на APK.
- [x] 11.5 RED не актуальний → білд дозволено.

---

# ЕТАП 12+ — АУДИТ ПІСЛЯ ПЕРЕДАЧІ АГЕНТІВ (2026-08-20, новий основний агент)
Реальний статус зведено ФАКТ-ЧЕКОМ по коду (не за PENDING-прапорцями старих файлів).

## 12 — Розбір dirty-tree останнього агента (fix/ui-bugs) [COMMIT DONE]
Останній агент змінив файли, але НЕ закомітив. Зміни безпечні + потрібні:
- [x] 12.1 `appStore.ts`: MMKV → AsyncStorage (dev-client стара arch не тягне mmkv 3.x; уникає "native MMKV Module could not be found"). БЕЗПЕЧНО: bookImport використовує `useAppStore.getState()`, не MMKV напряму.
- [x] 12.2 `monetization.native.ts` + `AdBanner.native.tsx`: lazy `require('react-native-google-mobile-ads')` → dev-client без нативного модуля НЕ падає на старті (metro mock діє тільки для локального Metro).
- [x] 12.3 `app.config.js` APP_NAME 'BookReader'→'Sapphire'; `AppSettingsModal` export app:'Sapphire'. Бренд консистентний.
- [x] 12.4 `LibraryScreen.tsx`: прибрано `application/pdf` з типів імпорту (PDF на нативі не парситься — окремий зовнішній вьюер).
- [x] 12.5 `bookParser.ts`: оновлено текст помилки (DOCX/ODT/RTF/HTML підтримуються).
- [x] 12.6 `metro.config.js`: ВИПРАВЛЕНО РЕГРЕС — повернуто `alias['react-native-web']=false` (останній агент випадково вилучив його, замінивши на ads-mock). Тепер ОБИДВА аліаси присутні. РИЗИК 'View config getter for component pre' знято.
- [x] 12.7 `bookImport.ts`: застарілий коментар "MMKV" → "appStore".
- [x] 12.8 `npx tsc --noEmit` → EXIT 0 (перевірено після правок).
- [x] 12.9 Закомічено як `chore: finalize fix/ui-bugs — AsyncStorage, lazy AdMob, Sapphire branding, metro react-native-web alias restore`.

## 13 — СТАРІ РАУНДИ: факт-чек (що РЕАЛЬНО лишилось) 
Старі PENDING-прапорці в BUGS_ROUND2/3, ROUND5, FORMATS_ROUND здебільшого ЗАСТАРІЛІ —
пізніші коміти доробили їх. Актуальний залишок:
- [x] ROUND2 TRAIN-2: react-native-tts → expo-speech@12 (є в package.json). DONE.
- [x] ROUND2 BLUR-NATIVE: expo-blur BlurView у ModalSheet (є import). DONE.
- [x] ROUND2 DICT-3: словник перше слово під хедером — виправлено insetTop (етап T3). DONE.
- [x] ROUND2 TXT-PERF: великий TXT гальмує — LibraryScreen імпортує через FlatList/ScrollView,
      але buildParagraphs мапить sentences синхронно (line 60). НЕ критично, чекає PERF-5.
- [x] ROUND3 EPUB-2: порожній text — epubParser тепер стійкий (regex маніфесту + candidates шляхів, cover fallback). DONE.
- [x] FORMATS_ROUND: DOCX/ODT/RTF/HTML парсери + LibraryScreen format switch — Є в коді. DONE.
- [~] ROUND5 PERF-1/2: DictionaryScreen вже FlatList + importEntries (batch). DONE.
- [~] ROUND5 PERF-4: SentenceRow `export default memo(SentenceRow)`. DONE.
- [ ] ROUND5 PERF-3: StyleSheet.create У ТІЛІ компонента лишається (Reader:669, Library:490, Dictionary:666).
      Кожен ререндер реалокує стилі. СЕРЕД — винести в useMemo/hoist.
- [ ] ROUND5 PERF-5: ReaderScreen відкриття великої книги → freeze. sentenceTranslations у AsyncStorage+JSON (libraryStore).
      ТЕХБОРГ: треба перенести в SQLite як chapters (ARCH_ANALYSIS FILE 1/2). НЕ блокує поточний білд.
- [ ] T678/T11b (з BUGS_FROM_USER): SupportAuthorModal — канбани суперечать (один DONE, інший НЕ ЗРОБЛЕНО).
      ФАКТ: SupportAuthorModal використовує ModalSheet (центрується, zIndex:1000 кореня) → T11b (центр) DONE.
      T678 (z-index під SettingsModal) — різні екрани, не перетинаються → не актуально. ЗАКРИТО.

## 14 — КРИТИЧНІ РИЗИКИ ПЕРЕД БІЛДОМ (пріоритет)
- [ ] 14.1 EAS-акаунт: memory/DEV-GUIDE = mike2424; handoff-файл пише mike4224 (помилка).
      ПЕРЕД БІЛДОМ підтвердити у користувача або по token у brbrbr.txt. Token = [REDACTED] (не в репо).
- [ ] 14.2 ОДИН білд у кінці етапу (заборона користувача 2026-08-14). Не білдити після кожного фіксу.
- [ ] 14.3 package.json досі містить `react-native-mmkv ^2.12.2` — більше не використовується (appStore на AsyncStorage).
      Залишити чи прибрати? Видалення = пересинхрон lockfile. НЕ блокує білд (dead dep). РІШЕННЯ користувача не треба — прибрати в прибиральному коміті.

## 15 — НАСТУПНІ КРОКИ (після підтвердження 14.1)
- [ ] 15.1 `eas build --profile preview --platform android` (WSL, ANDROID_HOME=/opt/android-sdk) → лінк APK.
- [ ] 15.2 Користувач ставить на телефон, перевіряє library/reader/словник/тренінг.
- [ ] 15.3 Якщо OK → `eas build --profile production` з AdMob ENV (ca-app-pub-* з .env / brbrbr.txt).
- [ ] 15.4 `eas submit --platform android` → Play Console (закритий тест ≥14д + ≥20 тестувальників перед продом).
