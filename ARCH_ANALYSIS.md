# ARCH_ANALYSIS.md — атомарний аналіз чужих АПК vs BookReader

Режим: тільки аналіз, НІЯКИХ змін коду BookReader.
Кожен файл (АПК/приклад) додається окремим розділом. Порівняння з BookReader
на атомарному рівні: framework, storage, virtualization списків, paging,
структура ресурсів, чим відрізняється від нашої архітектури.

## Що фіксую для кожного АПК
1. Тип framework (RN / Flutter / нативна Java/Kotlin / Cordova/WebView).
2. storage: SharedPreferences / SQLite / MMKV / Room / DataStore / AsyncStorage.
3. Списки: чи є віртуалізація (RecyclerView/Paging/FlatList/ListView)?
4. Розмір АПК, кількість dex, native .so бібліотеки.
5. Як парсять великі тексти/словники (з назв класів).
6. Відмінності від BookReader (конкретно, атомарно).

---

## [FILE 1] readera-26-05-20plus2300.xapk (ReadEra — книжковий reader)
- шлях: C:\Users\DELL\Downloads\readera-26-05-20plus2300.xapk (32.3 MB, XAPK)
- структура XAPK: org.readera.apk (головний) + купа config.*.apk (мовні/екранні ресурси)

### Framework
- Native Android (Kotlin/Java). Маркери: `kotlin/`, `DebugProbesKt.bin`, `META-INF/*kotlin*`.
- НЕ React Native, НЕ Flutter. 2 dex (multidex): classes.dex + classes2.dex.
- Немає native .so (pure Kotlin/Java, без C++ модулів).
- Залежності: Firebase (analytics/crashlytics), OkHttp, play-services (ads id).

### Storage
- `CursorAdapter` (2 згадки) → SQLite курсорне завантаження (читає порціями з БД, НЕ весь масив у пам'яті).
- `androidx.room` (3) + `realm` (3) присутні → або Room (SQLite ORM), або Realm.
- `SharedPreferences` (12+2) — тільки для налаштувань/флагів, НЕ для даних книг/словника.
- `SQLiteDatabase`/`SQLiteOpenHelper` (4+1) — прямий SQLite.
- ВИСНОВОК: дані (книги, словник) живуть у SQLite/Realm, завантажуються курсором порціями. НЕ тримають 50k слів у пам'яті як масив.

### Virtualization (списки)
- `RecyclerView` (64+7 згадок) — віртуалізація ВСІХ списків (бібліотека, словник, глави).
- `ViewPager` (19+2) — сторінки/таби.
- `ListAdapter` (2) — DiffUtil-оптимізований адаптер.
- `PagerAdapter` (3).
- `CursorAdapter` (2) — список напряму з SQLite курсора (порційне читання БД).
- Android Paging (PagingData/AsyncPagingDataDiffer) НЕ знайдено → віртуалізація через RecyclerView + курсор, не через Paging library.

### Словник ( dict module)
- Ізольований пакет `org.readera.dict` (dict.about, dict.filters) — словник окремий модуль, своя БД-таблиця/логіка.
- Фільтри словника (dict.filters) — SQL-фільтрація на рівні БД, не in-memory filter по масиву.

### Підтримувані формати
- epub, fb2, **mobi (17 згадок!)**, docx, pdf, **djvu** — повний набір включно з MOBI та DJVU.
- У BookReader ЗАРАЗ: txt, epub, fb2, docx, odt, rtf, html. НЕМАЄ: mobi, djvu, pdf (pdf = заглушка).

### Розмір/склад
- 32.3 MB XAPK. Головний APK ~ (org.readera.apk). config.*.apk — ресурси мов (af, ar, az, be, bg, bn, ca, cs, da, de, el, es, et, eu, fa, fi, fil, fr, gl, gu, hdpi, hi, hr, hu, hy...).
- Немає OBB (всі ресурси в APK-сплітах).

### ВІДМІННОСТІ від BookReader (атомарно)
| Аспект | ReadEra | BookReader | Проблема BookReader |
|---|---|---|---|
| Framework | Native Kotlin | RN (Expo) | — |
| Список слів 50k | RecyclerView + курсор БД (порції) | ScrollView + map по масиву з store | УСІ картки монтуються разом → freeze |
| Storage слів | SQLite/Realm (курсор) | AsyncStorage → весь масив JSON у пам'яті | Кожен set перезаписує весь масив → 5с freeze на 1k, не витримає 50k |
| Фільтр словника | SQL WHERE у БД | `filtered = entries.filter()` у render | O(N) на кожен рендер |
| Reader текст | RecyclerView/курсор сторінок | FlatList (OK) але parse→array→state | Парсинг великих книг синхронний |
| Модульність | dict окремий пакет | dict у store/libraryStore | Менша ізоляція |

### ВИСНОВОК (що взяти у ReadEra)
1. **SQLite/Realm замість AsyncStorage** для словника + книг → курсорне читання порціями (витримує 50k+).
2. **RecyclerView≡FlatList** — уже маємо, але треба замінити ScrollView словника на FlatList (PERF-2 не зроблено).
3. **Фільтрація на рівні storage**, не in-memory map.
4. **MOBI/DJVU** формати — ReadEra підтримує, нам треба додати (mobi складний, djvu рідкісний).
5. Архітектура BookReader НЕ "слабка" принципово (RN теж може), але storage/view pattern НЕ масштабується на 50k — треба SQLite + FlatList.

---

## [FILE 2] readera-26-05-20plus2300.apk (ReadEra — повна збірка з native парсерами)
- шлях: C:\Users\DELL\Downloads\readera-26-05-20plus2300.apk (18.6 MB, APK)
- структура: org.readera головний APK (БЕЗ config-сплітів мов, тому менший за XAPK)

### Framework
- Native Android (Kotlin/Java), 2 dex, + **native .so бібліотеки** (на відміну від XAPK-розпакування, де lib/ не було видно).
- .so файли (armeabi-v7a):
  - `liberacomic.so` — EPUB/Comic парсер (C++)
  - `liberadjvu.so` — **DJVU** парсер (C++)
  - `liberaepub.so` — **EPUB** парсер (C++)
  - `liberamobi.so` — **MOBI** парсер (C++)
  - `liberapdf.so` — **PDF** парсер (C++)
  - `libreadera.so` — ядро
  - `libfontmanager.so` — менеджер шрифтів

### КЛЮЧОВИЙ ВИСНОВОК: парсери форматів — NATIVE C++
- EPUB/MOBI/DJVU/PDF розпарсуються нативними .so бібліотеками (швидко, ефективно),
  НЕ Java/JS. Саме тому ReadEra відкриває всі формати і не лагає на великих файлах.
- Це пояснює, чому наш JS-парсер (epubParser через jszip) повільніший і не має MOBI/DJVU.

### Virtualization (збігається з FILE 1)
- RecyclerView (64+7), ViewPager (19+2), ListAdapter (2), PagerAdapter (3), CursorAdapter (2).

### Storage (збігається з FILE 1)
- CursorAdapter (SQLite курсор порціями) + androidx.room (3) + realm (3) + SQLiteDatabase/OpenHelper.
- SharedPreferences — тільки налаштування.

### Формати (збігається з FILE 1)
- epub, fb2, mobi(17+5), docx, pdf, djvu, txt(5) — повний набір.

### ВІДМІННОСТІ від BookReader (атомарно)
| Аспект | ReadEra (FILE 2) | BookReader | Проблема BookReader |
|---|---|---|---|
| Парсинг EPUB/MOBI/DJVU/PDF | Native C++ .so (швидко) | JS (jszip/epubParser) | Повільно на великих; немає MOBI/DJVU |
| Список 50k слів | RecyclerView + курсор БД | ScrollView + map | Freeze |
| Storage | SQLite/Realm (курсор) | AsyncStorage (весь масив) | 5с freeze на 1k |
| Фільтр | SQL WHERE | .filter() render | O(N) per render |

### ВИСНОВОК (що взяти у ReadEra — оновлено)
1. **SQLite/Realm замість AsyncStorage** → курсорне читання (витримує 50k+).
2. **FlatList замість ScrollView** для словника (PERF-2 не зроблено).
3. **Фільтрація на рівні storage**, не in-memory.
4. **MOBI/DJVU** — ReadEra через native .so; нам треба або native парсер, або JS-бібліотека (mobi складний). PDF — expo-pdf.
5. **Архітектура BookReader НЕ слабка** (RN може FlatList+SQLite), але storage/view pattern НЕ масштабується → треба SQLite + FlatList.

---

## [FILE 3] — ОЧІКУЄТЬСЯ
- шлях/назва:
- framework:
- storage:
- virtualization:
- dex/.so:
- native parsers (.so):
- text/list architecture:
- відмінності від BookReader:
- висновок:

