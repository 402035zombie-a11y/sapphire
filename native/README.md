# Native parsing module (TurboModule) — PLAN

Цей модуль замінює JS-парсинг на нативний (Kotlin/Swift+JSI), щоб прибрати фриз при відкритті книг.
Статус: **РЕАЛІЗОВАНО для EPUB + FB2 (Android)**. Фасад `services/bookParser.ts` спершу пробує
нативний шлях, при відсутності модуля/помилці — тихий фолбек на JS-парсери.

## Де що лежить (фактично)
| Файл | Роль |
|---|---|
| `specs/NativeBookParser.ts` | codegen-спека TurboModule (JSI), RN Codegen генерує `NativeBookParserSpec` |
| ~~`com/bookreader/app/bookparser/`~~ | ВИДАЛЕНО 2026-10-23 — нативного парсера більше немає |
| `.../bookparser/BookParserPackage.kt` | `BaseReactPackage`, `isTurboModule = true` |
| ~~`com/bookreader/app/MainApplication.kt`~~ | ВИДАЛЕНО 2026-10-23 |
| `services/nativeBookParser.ts` | JS-бридж + нормалізація у `ParsedBook` |
| `package.json` → `codegenConfig` | `{ name: AppSpecs, type: modules, jsSrcsDir: specs }` |

Модуль повертає ОДИН JSON-рядок (не об'єкт) — щоб не платити за bridging тисяч глав.

## Readium
Поточна реалізація EPUB — системні API (`java.util.zip`, `org.json`), 0 сторонніх залежностей,
0 ліцензійних ризиків. Readium Mobile (BSD-3) підключається як drop-in заміна тіла
`parseEpubSync()` без зміни публічного контракту, коли знадобиться складніший EPUB3 (media overlays).


## Архітектура
```
RN(JS) → TurboModule(JSI) → Kotlin/Swift парсер → JSON-структура глав → RN рендерить
```
Парсинг у нативному потоці → JS-потік вільний.

## Бібліотеки (MIT/BSD, не GPL/AGPL)
- EPUB: Readium Mobile (Kotlin, BSD-3) / Readium Swift.
- FB2: власний XML-парсер (FB2 = один XML).
- PDF: Android PdfRenderer (system) + iOS PDFKit.
- TXT: нативно.

## Інтеграція
1. `expo prebuild` (EAS через WSL, не Windows — баг git clone 3-слеш).
2. Створити `native/android/.../BookParserModule.kt` + `BookParserPackage.kt`.
3. iOS: `native/ios/.../BookParserModule.mm` + Swift.
4. JS-брідж: `services/nativeBookParser.ts` реалізує `BookParser` з `bookParser.ts`.
5. У `bookParser.ts` замінити делегування на `nativeBookParser` (поетапно, формат за форматом).

## Конфлікти (див. lessons-learned Б)
- KotlinVersion НЕ форсувати (AdMob тягне 2.1.0).
- expo-speech тільки ~12.
- Після білду: `pkill -f gradle && rm -f /tmp/eas-*.log`.
