# BookReader: словарный цикл и тренировка — план

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Замкнуть core-loop пользователя: читать с двойным переводом → добавлять/импортировать слова книги в общий словарь (с частотой и меткой книги) → тренировать их с весом по усвоению (выученные box≥4 исключаются) → видеть прогресс в словаре.

**Architecture:** Надстройка над существующими `dictionaryStore` (карточки слов) и `trainingStore` (Leitner 5 боксов). Новое поле `frequency` в словарной карточке; bulk-импорт слов книги через пакетный перевод; фильтры в `DictionaryScreen` и `TrainingScreen` по «оценке» (join dictionary×training) и по `bookId`.

**Tech Stack:** React Native + Expo (web), Zustand+persist, googleGtx перевод (без ключа), существующие `utils/wordTokenizer`, `utils/sentenceSplitter`.

---

## Этап 1 — Частота слова в словаре (модель данных)

**Objective:** Карточка слова хранит, сколько раз слово встретилось в книге; дедуп сохраняется, но счётчик растёт.

**Files:**
- Modify: `store/dictionaryStore.ts`

**Task 1.1: Поле frequency в DictionaryEntry**
- Добавить `frequency?: number` в интерфейс `DictionaryEntry` (дефолт 1).

**Task 1.2: Merge при addEntry**
- В `addEntry`: если слово (word|lang) уже есть — НЕ создавать карточку, а увеличить `frequency` существующей на `entry.frequency ?? 1`.
- Иначе добавить с `frequency: entry.frequency ?? 1`.

**Task 1.3: Merge при importEntries**
- В `importEntries`: при совпадении ключа — суммировать `frequency` (существующая + импортируемая), не дублировать.

**Task 1.4: Вес при добавлении из попапа слова (ReaderScreen)**
- В `WordBottomSheet.onSave` проставлять `bookId` (сейчас не проставляется) и `frequency: 1`.

Верификация: `hermes verify --json` → ok:true.

---

## Этап 2 — Извлечение и bulk-импорт словаря книги

**Objective:** При загрузке книги пользователь может залить уникальные слова книги в словарь пакетным переводом; частота = число вхождений.

**Files:**
- Create: `utils/bookWords.ts` — `extractBookWords(paragraphs): {word, frequency}[]`
- Create: `services/bookDictionaryService.ts` — `buildBookDictionary(paragraphs, lang, targetLang, onProgress): Promise<Omit<DictionaryEntry,'id'|'createdAt'>[]>`
- Modify: `screens/LibraryScreen.tsx` (draft-карточка: кнопка + прогресс)
- Modify: `store/libraryStore.ts` — `Book` уже содержит `paragraphs`; ничего менять не надо, кроме вызова сервиса.

**Task 2.1: extractBookWords**
- Взять все `paragraphs[].original`, токенизировать (`wordTokenizer.normalizeWord`), посчитать частоту каждого уникального слова. Вернуть отсортированный по частоте массив.
- Отсев: слова короче 2 букв, чисто пунктуация/числа — пропускать.

**Task 2.2: buildBookDictionary (пакетный перевод)**
- Из `extractBookWords` взять **топ-N по частоте** (дефолт 200; параметр `limit`). Чанками по 20 слов склеивать в one translate-запрос (`translateCached`/`translate` с `\n` или ` | ` разделителем), распарсить обратно.
- Для каждого: `DictionaryEntry` с `word`, `translation` (из перевода), `lang`, `bookId`, `frequency`, `context` (первое предложение книги с этим словом — опционально, можно пустым).
- `onProgress(p)` вызывать после каждого чанка.

**Task 2.3: Кнопка в draft-карточке LibraryScreen**
- В `draftCard` добавить переключатель «Импортировать словарь книги (топ-200)» + кнопку «Импорт» с прогресс-баром. По завершении — `importEntries(list)` с `bookId` черновика.
- После сохранения книги (`saveDraft`) слова уже в словаре (импорт до или после — без разницы, `bookId` известен из draft).

**Task 2.4: Бейдж в библиотеке**
- В `bookRow` показывать «N слов» = число entries с `bookId === item.id` (селектор по dictionaryStore).

Верификация: `hermes verify` + ручной сценарий (загрузить txt, импортировать словарь, открыть Словарь → видны слова с частотой и bookId).

---

## Этап 3 — Фильтр по оценке в Словаре (tab = вся библиотека)

**Objective:** Экран «Словарь» показывает ВЕСЬ словарь библиотеки; добавить фильтр по усвоению (join dictionary × training) и показ частоты.

**Files:**
- Modify: `screens/DictionaryScreen.tsx`
- Modify (если нужно): `store/trainingStore.ts` — добавить селектор `levelOf(word, lang): 'new'|'learning'|'learned'`.

**Task 3.1: Селектор уровня**
- `trainingStore`: `levelOf(word, lang)` → `progress[k]` нет → `'new'`; `box >= 4` → `'learned'`; иначе `'learning'`.

**Task 3.2: UI фильтра**
- Сегмент-фильтр: Все / Новые / В изучении / Выученные. Плюс существующая сортировка (A-Z / Дата / Язык).
- Карточка слова: показывать бейдж уровня (цветом) + «×N» (frequency, если >1) + счётчик «Всего слов: M».

**Task 3.3: (опц.) фильтр по книге**
- Выпадающий список книг (из libraryStore) — «Все книги» + по bookId. Не блокирует основной сценарий (по умолчанию — все).

Верификация: `hermes verify` + проверка фильтров в браузере.

---

## Этап 4 — Тренировка: источник + вес по усвоению

**Objective:** Тренировка берёт слова либо из всей библиотеки, либо из конкретной книги; выученные (box≥4) исключаются; новые/с ошибками появляются чаще.

**Files:**
- Modify: `store/trainingStore.ts` — `dueWords(entries, opts?)` с `bookId?` и `excludeLearned` (box≥4).
- Modify: `screens/TrainingScreen.tsx` — выбор источника + вес.
- Modify: `screens/ReaderScreen.tsx` — в бургере пункт «Тренировать слова книги» → navigate Training с `bookId`.

**Task 4.1: dueWords с опциями**
- Сигнатура: `dueWords(entries, now?, opts?: { bookId?: string; excludeLearned?: boolean })`.
- Фильтр по `bookId` (если задан — только entries с этим bookId).
- `excludeLearned` → отбрасывать `progress[k]?.box >= 4`.
- Возвращать с весом: `weight = correctStreak === 0 ? 3 : box <= 2 ? 2 : 1` (новые/ошибочные чаще).

**Task 4.2: Выбор источника в TrainingScreen**
- Сегмент: «Вся библиотека» / «Книга: <название>» (если передан bookId через route params).
- Выборка кандидатов: `dictionaryStore.entries` (все или по bookId) → `dueWords` с весом → перемешивание с учётом веса.

**Task 4.3: Переход из ридера**
- В `menuItems` ReaderScreen добавить: `{ label: 'Тренировать слова книги', icon: 'school', action: () => navigation.navigate('Training', { bookId }) }`.

**Task 4.4: Счётчик и логика «5 верных подряд»**
- Существующая логика streak (5 верных → следующее) сохраняется. Счётчик «Слово N из M» по уникальным кандидатам.

Верификация: `hermes verify` + сценарий (добавить 5 слов, потренировать, дойти до box≥4, убедиться что слово исчезло из кандидатов).

---

## Этап 5 — Финальная шлифовка ридера (юзабилити)

**Objective:** Popap слова и бургер поддерживают книго-привязку словаря.

**Files:**
- Modify: `components/WordBottomSheet.tsx` (уже проставляет bookId? проверить; если нет — добавить проп `bookId`).
- Modify: `screens/ReaderScreen.tsx` (передавать `bookId` в WordBottomSheet).

**Task 5.1: bookId в попапе слова**
- `WordBottomSheet` принимает `bookId?`, прокидывает в `addEntry`.

**Task 5.2: Визуальная проверка всего цикла**
- Чтение (двойной перевод) → тап по слову → «Сохранить в словарь» (с bookId+freq=1) → бургер «Тренировать слова книги» → тренировка по книге → Словарь (фильтр по оценке, частота).

Верификация: `hermes verify` + полный сценарий в браузере (expo start --web, порт 8000, без эмулятора).

---

## Риски / Trade-offs
- Пакетный перевод 200 слов = ~10 запросов googleGtx. Чанки по 20, последовательно с паузой 150ms, чтобы не триггерить лимиты. Прогресс-бар в UI.
- «Выучено» = box≥4 (компромисс: 3 верных подряд, не 10). Исключается из dueWords когда `excludeLearned`.
- Словарь tab = ВСЯ библиотека (по требованию). Фильтр по книге — опциональная доп. кнопка, не меняет дефолт.

## Файлы, которые меняются (сводно)
- `store/dictionaryStore.ts` (frequency, merge)
- `store/trainingStore.ts` (dueWords opts, levelOf)
- `utils/bookWords.ts` (new)
- `services/bookDictionaryService.ts` (new)
- `screens/LibraryScreen.tsx` (кнопка импорта, бейдж)
- `screens/DictionaryScreen.tsx` (фильтр по оценке, частота)
- `screens/TrainingScreen.tsx` (выбор источника, вес)
- `screens/ReaderScreen.tsx` (пункт тренировки книги, bookId в попап)
- `components/WordBottomSheet.tsx` (bookId проп)
