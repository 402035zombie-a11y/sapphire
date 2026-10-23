# Sapphire — AUDIT STATE (2026-08-30, paid model session)

## ОНОВЛЕНО 2026-10-21 — T1–T12 COMPLETED

Усі 12 задач Kanban виконано й перевірено на телефоні. Повний лог:
`.hermes/plans/implementation-plan-log.md` + `.hermes/plans/2026-10-21_session-summary.md`.

**Підтверджено на телефоні (Xiaomi 23124RA7EO):**
- MOBI-фікстура була хибною, production-парсер — правильний (збіг із попереднім аудитом).
- Текст книги читається з SQLite (`getBookChapters`) — проблема з `libraryStore.paragraphs`
  підтвердилась як неактуальна для нових книг (self-heal `ensureBookChapters` працює).
- Теми: Day `#EAD9BE`, Night `#1C1D21`, Blackout `#050505` (flat, 0 прозорості) — inset-тіні видимі,
  білого outline в Day немає (регресія з 4 перевірок не повторилась).
- RTF Win1252: 26 байтів 0x80–0x9F, U+FFFD = 0.

**Технічні уроки, які треба зберегти:**
1. Hermes не підтримує `import.meta.url` → Web Worker неможливий на RN.
2. RTF `\'hh` = Windows-1252 (мапінг у Unicode), парсер читає байти, не UTF-8 рядки.
3. Android inset: кольоровий бордер (dark top/left, light bottom/right) + `elevation: 0`.
   НЕ `shadowRadius`/`shadowOpacity` (рівномірний ореол ≠ лунка).
4. Blackout = FLAT, 0 прозорості.

---

## Що було ЗЛАМАНО слабшими моделями (і виправлено)

### 1. TSC не компілювався (КРИТИЧНО)
`theme/neu.ts` — металTab/metalTabStamp використовували spread на union-тип
`...(isWeb ? { boxShadow: insets } : insets)` де `insets: string | object` →
`error TS2698: Spread types may only be created from object types`.
**Фікс:** `const insets: any = ...` (коміт 2c8ed23f).

### 2. Неоморфізм Android — "візуально зламався ЮІ" (КОРІНЬ)
Batch-7 (dd544001) додав у `neuMetalInset` ранній `return` для Android:
рівномірний `borderColor: shadowDark` БЕЗ метал-фону і БЕЗ світлої кромки →
всі inset-елементи стали "картонними". Слабші моделі далі:
- додали лише `borderTopWidth/borderLeftWidth` (неповна рамка, без bottom/right)
- створили spread-union помилку (див. #1)

**Фінальний патерн (для ВСІХ ролей, консистентно):**
- Android: `backgroundImage`(gradient) і `boxShadow`(особливо `inset`) НЕ рендеряться.
- Імітація ВДАВЛЕННЯ (inset): 4-сторонній кольоровий бордер — темний top/left,
  світлий bottom/right, `elevation: 0`.
- Імітація ВИПУКЛОСТІ (raised): світлий top/left + темний bottom/right, `elevation: 2`.

Ролі, які тепер мають Android-гілку:
- `neuMetalInset` (inset) ✅
- `metalTab` active (tabActive) ✅
- `metalTabStamp` (tabStampActive) ✅
- `metalStamp` (stamp) ✅
- `neuMetalCircleInset` (circleInset — кнопка видалення книги) ✅
- `neuDeleteBtn` (deleteBtn — видалення слова, був elevation 2 = НЕПРАВИЛЬНО випуклий) ✅
- `neuSpeakBtn` (speakBtn — випуклий) ✅
- `neuLibraryDeleteBtn` (libraryDeleteBtn — випуклий) ✅
- `neuConvexConcave` (профіль 2) — має shadow*/elevation fallback, НЕ чіпано.

## "Текст не з'являється" — ДІАГНОСТИКА (не вирішено повністю, потрібен пристрій)

Архітектура: **текст книги повністю в SQLite (books.db.chapters)**.
`LibraryScreen.saveDraft` зберігає `paragraphs: []` (легкий desc).
`libraryStore.paragraphs` ЗАВЖДИ порожній для нових книг.

Потік: `pickDocument → asset.uri (file://) → parseBook → importBook(asset.uri, format, forcedBookId=bookId) → INSERT chapters`.

`ReaderScreen.chapters` = `getBookChapters(bookId)`; якщо порожньо →
`ensureBookChapters` (self-heal, реімпорт з `row.path`).

**Мій chapters-fallback на `libraryStore.paragraphs` БЕЗСИЛИЙ** (paragraphs=[] завжди).
Він допомагає ЛИШЕ старим книгам (до SQLite-міграції), що мали текст у store.

Можливі причини пустого тексту (треба пристрій/логи):
1. `parseTxt` використовує `fetch(file://)` — може НЕ працювати на Android
   (SDK54 polyfill нібито підтримує, але не гарантовано). Перевірити epub vs txt.
2. Файл очищено (DocumentPicker cache) → `ensureBookChapters` не може реімпортувати.
3. Конкретна книга ніколи не потрапила в БД (importBook зловив помилку мовчки).

## Ключові факти (не повторювати помилки)
- НЕ додавати `boxShadow`/`inset`/`backgroundImage` на Android — не рендериться.
- НЕ використовувати spread на union-тип у neu.ts (tsc падає).
- `metal()` = диспетчер ролей (не "метал" буквально) — назва стара, але це API.
- Текст у SQLite, НЕ в store. Fallback на store.paragraphs не працює для нових книг.

## Checkpoints
- v2.1 — останній release checkpoint (до перенесення тексту в SQLite).
- 2c8ed23f — мій аудит-коміт (tsc + тема Android + donate + chapters fallback).
