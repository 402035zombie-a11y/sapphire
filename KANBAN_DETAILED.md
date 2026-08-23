# KANBAN — актуальні задачі (Sapphire)

> Єдиний канбан. Старі: KANBAN_DETAILED.md (етапи 1-16 — виконані), KANBAN_USER_REQUESTS.md
> (T1-T8 — виконані), TESTING_CHECKLIST.md (web-E2E — застаріло) — ВИДАЛЕНІ 2026-08-24.
> Правила: верифікація ТІЛЬКИ на телефоні (web deprecated); ОДИН білд наприкінці етапу;
> `npx tsc --noEmit` після кожної правки.

## 🔴 Пріоритет: міграція словника + FSRS у SQLite

**Тригер:** словник уже впирається в AsyncStorage/CursorWindow ліміт — у логах:
`[createStore] rehydrate failed for key=persist:bookreader-dictionary: Row too big to fit into CursorWindow`.

- [ ] Схема v4: `dict_entries(word, lang, surface_form, book_id, freq, created_at)` +
      `translations(entry_id, text, book_id)` + `fsrs_state(word, lang, stability, difficulty, due_at, ...)`.
- [ ] dictionaryStore/trainingStore → читання/запис через БД; AsyncStorage лишається тільки для settings.
- [ ] Чиста зміна сховища БЕЗ міграції старих JSON-даних (юзер підтвердив: тестові дані не потрібні).

## Multi-переклади слів (обговорено з юзером, чекає на SQLite вище)

- [ ] При імпорті книги перекладати НЕ окремі слова, а перевикористати sentence_translations.
- [ ] quiz/cloze: correct = будь-який translations[]; type: приймати будь-який.
- [ ] TF: дистрактори тільки з інших слів (валідні альтернативи того ж слова — прибрати).
- [ ] НЕ тягнути всі словникові значення — тільки вживання в книгах юзера.

## Швидкість імпорту словника

- [ ] Перевикористання sentence_translations замість ~250 послідовних translate-запитів.

## Публікація

- [ ] EAS production build (WSL, див. DEV-GUIDE) → closed testing (≥14д, ≥20 тестувальників).
- [ ] Стор-лістинг: скріни, опис (i18n), feature graphic є (docs/sapphire-feature-graphic.png).

## Виконані фікси (2026-08-24, коміти 2c535804..e833e16b)

- [x] useSyncExternalStore + selector equality (стабільні посилання обов'язкові!)
- [x] Переклади речень + текст книг → books.db v3; libraryStore = легкі desc
- [x] importBook id-mismatch (parse-once був мертвим кодом); draft id детермінований
- [x] Видалення книги чистить SQLite (deleteBookData)
- [x] Словник importEntries O(n²)→O(n)
- [x] Speed reading "немає слів": TXT-імпорт не писав глави в БД + fallback старих книг на JSON
- [x] Cloze forward: правильна відповідь підсвічувалась червоною (порівняння з maskedWord)
- [x] Квадратні тіні: безумовний elevation на градієнтних/прозорих фонах (neu.ts)
- [x] uk i18n: 'Блекаут' без пояснення
