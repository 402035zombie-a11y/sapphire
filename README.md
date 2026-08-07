# BookReader

Мобильное приложение для чтения книг на иностранном языке с параллельным переводом и интерактивным словарём. Аналог 2books с открытой и удобной логикой.

## Возможности (план)
1. Загрузка книг `.epub` и `.txt` с устройства.
2. Парсинг и разбиение текста на предложения с параллельным переводом.
3. Интерактивное чтение: клик по слову → всплывающее окно с переводом.
4. Локальный словарь: сохранение слова с контекстом (предложением) на устройстве.
5. Модуль тренировки: интервальное повторение (флеш-карточки / викторина 4 варианта).

## Технологический стек
- React Native (Expo SDK 51)
- TypeScript
- React Navigation (Bottom Tabs + Native Stack)
- Zustand + persist (AsyncStorage)
- Базовый StyleSheet
- Перевод: плагинный слой `translationService` (Google GTX без ключа / Google Paid / DeepL — подключается пользовательским ключом в Настройках)

## Статус разработки
- [x] Шаг 1: Scaffold (App, навигация, theme, сторы, translationService)
- [x] Шаг 2: Загрузка книг (epub/txt), парсеры, шкала загрузки, LanguagePicker
- [x] Шаг 3: ReaderScreen (параллельный перевод, 2 колонки, ленивый перевод по scroll-stop), Settings
- [ ] Шаг 4: BottomSheet перевода по клику на слово
- [ ] Шаг 5: Экран словаря (просмотр/удаление/экспорт)
- [ ] Шаг 6: Тренировка (интервальное повторение, викторина)

## Запуск
```bash
npm install
npx expo start
```
Отсканируй QR в приложении Expo Go (устройство в той же Wi-Fi сети, что и ПК).

## Структура
```
navigation/   — AppNavigator (Tabs + Stack)
store/        — library / dictionary / training / settings (Zustand persist)
services/     — translationService, epubParser, txtParser
utils/        — sentenceSplitter, wordTokenizer, languages
components/    — SentenceRow, LanguagePicker, ProgressBar, WordBottomSheet
screens/      — Library, Reader, Dictionary, Training, Settings, WordSheet
theme/        — constants (цвета, шрифты, размеры)
```
