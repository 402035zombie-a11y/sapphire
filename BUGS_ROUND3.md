# BUGS ROUND 3 — канбан (білд по команді "білд")

Після білду ff7edbff користувач відкрив модалку вибору мов (BOOK-1 виправлено,
але LanguagePicker тепер окрема ModalSheet і список обрізається до 1 рядка).

## Статус
- [ ] BOOK-1.2: LanguagePicker (окрема ModalSheet) показує тільки інпут + 1 рядок,
       список не видно (flex:1 стає 0 у не-flex панелі ModalSheet). ТРЕБА: прибрати
       flex:1, дати ScrollView явну maxHeight, збільшити ModalSheet maxHeight.
       PENDING

## Етапи
- Етап 1: BOOK-1.2 (fix LanguagePicker layout)
- Етап 2: БІЛД (по команді)
