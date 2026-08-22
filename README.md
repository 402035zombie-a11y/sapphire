# BookReader

Мобільний додаток для читання книг іноземною мовою з паралельним перекладом, інтерактивним словником та тренуванням. Аналог 2books з відкритою та зручною логікою.

## Можливості
1. Завантаження книг `.epub` та `.txt` з пристрою.
2. Парсинг та розбиття тексту на речення з паралельним перекладом.
3. Інтерактивне читання: тап по слову → випливаюче вікно з перекладом + додавання в словник.
4. Локальний словник: збереження слів з контекстом (реченням) на пристрої.
5. Модуль тренування: інтервальне повторення (флеш-картки / вікторина 4 варіанти).
6. 4 режими читання: звичайний / з перекладом / швидкочитання / біжучий рядок (бігуча стрічка).
7. Монетизація через AdMob (банер у бібліотеці + винагороджена реклама в "Підтримати автора").

## Технологічний стек
- React Native (Expo SDK **54**)
- TypeScript
- React Navigation (Bottom Tabs + Native Stack)
- Zustand + persist (AsyncStorage)
- React Native Reanimated / Worklets (анімації)
- react-native-google-mobile-ads (AdMob)
- Переклад: плагінний шар `translationService` (Google Translate без ключа / Google Paid / DeepL — підключається ключем у Налаштуваннях)

## Статус розробки
- [x] Scaffold (App, навігація, theme, стори, translationService)
- [x] Завантаження книг (epub/txt), парсери, шкала завантаження, LanguagePicker
- [x] ReaderScreen (паралельний переклад, 2 колонки, лінивий переклад по scroll-stop)
- [x] BottomSheet перекладу по кліку на слово
- [x] Екран словника (перегляд/видалення/експорт)
- [x] Тренування (інтервальне повторення, вікторина)
- [x] 4 режими читання (звичайний / переклад / швидкочитання / бігуча стрічка)
- [x] AdMob (банер + винагороджена реклама)
- [x] Адаптивний UI (масштабування під дисплей)

## Запуск (development)
```bash
npm install
npx expo start
```
Для нативних модулів (AdMob) використовуй dev/preview білд, не Expo Go:
```bash
eas build --profile development --platform android
# або
eas build --profile preview --platform android
```

## Збірка та публікація
Див. `PUBLISHING.md` та `RELEASE_TODO_USER.txt` — покрокові інструкції для Google Play та генерації APK/AAB.

## Структура
```
navigation/   — AppNavigator (Tabs + Stack)
store/        — library / dictionary / training / settings (Zustand persist)
services/     — translationService, epubParser, txtParser
utils/        — sentenceSplitter, wordTokenizer, languages
components/    — SentenceRow, LanguagePicker, ProgressBar, WordBottomSheet, ui/*
screens/      — Library, Reader, Dictionary, Training, Settings, WordSheet, SpeedReading, Marquee
theme/        — constants (кольори, шрифти, розміри), neu (неоморфізм)
```
