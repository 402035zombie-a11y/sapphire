# BUGS_FROM_USER — збір багів зі скріншотів користувача (BookReader, Android)

Кожен баг прив'язаний до скріна, що його показав користувач. Root-cause і фікс —
у KANBAN_DETAILED.md (етап T1–T13).

## Скрін → Баг (підтверджено візуально)
- Скрін 1 → T9: DictionaryScreen "Which dictionary to open?" — модалка в самому низу, обрізана під навігацією.
- Скрін 2 → T2: "Error reading file" — root cause у тексті помилки: `readAsStringAsync` з `expo-file-system` deprecated/throws у SDK54. Фікс: міграція на fetch / новий File API.
- Скрін 3 → T3: LibraryScreen — статус-бар (час) обрізаний зверху, "Search library" обрізаний зліва. Хедер залізає під шторку.
- Скрін 4 → T11: SupportAuthorModal ("Support the author") — у ВЕРХНІЙ частині (під статус-баром), не по центру.
- Скрін 5 → T5: LanguagePickerModal ("5 to c1") — у верхній половині екрана, не по центру.
- Скрін 6 → T4: LanguagePickerModal dropdown мов — "Original language" показує стрілку, але список НЕ випадає / обрізається батьківською модалкою.
- Скрін 7 → T5 (дубль): LanguagePickerModal не по центру.
- Скрін 8 → T12: Reader звичайний режим — текст ЗЛИВАЄТЬСЯ БЕЗ ПРОБІЛІВ ("Notonlyhadshe..." замість "Not only had she..."). Плюс підкреслення фраз.
- Скрін 9 → T6: LibraryScreen "How do you want to open the book?" (Normal/With translation/Speed reading) — у нижній третині, НАКЛАДАЄТЬСЯ на bottom nav, "Speed reading" обрізаний.
- Скрін 10 → T5 (дубль): LanguagePickerModal не по центру.
- Скрін 11 → T7: SettingsModal (шестеренка, "Typography settings") — bottom sheet; T13: у модалці є dropdown "Translation language" (старий пункт, що просили видалити); T12: текст англ. без пробілів.
- Скрін 12 → T10: DictionaryScreen "Add word" — у нижній частині, НАКЛАДАЄТЬСЯ на bottom nav, обрізується (права частина помаранчевої кнопки обрізана краєм екрану, слово "rigorous" обрізане).

## Баги без скріна (описані користувачем)
- T1: Training — поле вводу не активне (клавіатура не вводить). Гіпотеза: TextField ref/focus або editable.
- T8: z-index — SupportAuthorModal відкривається ПІД SettingsModal (stacking order).

## Статус фіксів (на гілці fix/ui-bugs)
- T13 — ВИКОНАНО (видалено блок "Translation language" з FontSettingsSheet.tsx).
- T12 — ВИКОНАНО (SentenceRow: додано `{' '}` після слова + прибрано underline).
- T3 — ВИКОНАНО (useAdaptive.insetTop + Screen/Reader/Training/Library/Dictionary).
- T45 (ModalSheet центрування + allowNested + embedded LanguagePicker + AppSettingsModal) — ВИКОНАНО.
- T1 — ВИКОНАНО (best-effort: rAF focus + editable/returnKeyType).
- T2 — ВИКОНАНО (txtParser→fetch; epubParser fetch OK; fb2Parser вже fetch).
- T678 / T11b — НЕ ЗРОБЛЕНО.
- RED — червоний текст/runtime error на localhost:8082 (потребує текст помилки від користувача).
