# BUGS ROUND 2 — канбан (білд робимо ТІЛЬКИ по команді "білд")

Статус після білду 14d4bd50 (коміт 9c48127) + поточних фіксів.

## Статус
- [x] BOOK-1: модалка вибору мов — прибрано `embedded`, рендерить власний ModalSheet ПОВЕРХ. (16a558f)
- [x] EPUB: content:// → copyAsync у cache → readAsStringAsync base64. (3c2001f)
- [x] READ-1: lineHeight 1.5→1.7 + marginRight:3 у словах. (разом з READ-4)
- [x] READ-4: глобус приховано у режимі `read` ({mode==='dual' &&}). (разом з READ-1)
- [ ] TRAIN-2: озвучення не працює (react-native-tts ризикований на SDK54). ЗАМІНИТИ на expo-speech@12 (сумісний з SDK54).
- [ ] BLUR-NATIVE: блюр фону модалок працює тільки на вебі (backdropFilter CSS). На нативі ігнорується → фон прозорий. ТРЕБА expo-blur (BlurView) для натива.
- [ ] DICT-3: словник — перше слово залазить під хедер (відступ малий).
- [ ] TXT-PERF: дуже великий TXT гальмує при швидкому скролі (треба FlatList замість map).

## Етапи
- Етап 1: BOOK-1 ✅
- Етап 2: EPUB ✅
- Етап 3: READ-1 ✅
- Етап 4: READ-4 ✅
- Етап 5: TRAIN-2 (expo-speech@12 замість react-native-tts)
- Етап 6: BLUR-NATIVE (expo-blur BlurView)
- Етап 7: DICT-3
- Етап 8: TXT-PERF (FlatList віртуалізація)
- Етап 9: БІЛД (по команді "білд")
