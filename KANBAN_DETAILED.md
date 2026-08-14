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
- [x] 10.1–10.4 Користувач підтвердив: RED не існує (веб-артефакт, хост працює). Білд дозволено.

## Етап 11 — ФІНАЛЬНИЙ БІЛД [IN PROGRESS]
- [ ] 11.1 `git status` — всі фікси в гілці fix/ui-bugs.
- [ ] 11.2 `npx tsc --noEmit` → EXIT 0.
- [x] 11.3 `eas build --profile preview --platform android` (WSL cloud, Kotlin 2.3.0 прибрано → 15.4.0 AdMob OK).
- [ ] 11.4 Дати користувачу лінк на APK.
- [x] 11.5 RED не актуальний → білд дозволено.
