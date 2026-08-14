# BUGS ROUND 3 — канбан (білд по команді "білд")

Після білду ff7edbff + фіксів:
1. BOOK-1.2: LanguagePicker список обрізався. ✅ a7f9b2c
2. READ-1.2: слова накладаються (lh1.7→1.8, mr3→6). ✅ 7032c1a
3. READ-1.3: letterSpacing зламав пробіли. Прибрано. ✅ 0950182
4. READ-1.4: pageMargins false (edge padding 0). ✅ 7b59dd7
5. DICT-3.2: словник — хедер absolute, список залазить під нього.
   Треба зробити відступ над списком (як для нижнього меню):
   хедер менший + list paddingTop = headerH + body + insetTop + pad + 10. PENDING

## Статус
- [x] BOOK-1.2 ✅ a7f9b2c
- [x] READ-1.2 ✅ 7032c1a
- [x] READ-1.3 ✅ 0950182
- [x] READ-1.4 ✅ 7b59dd7
- [ ] DICT-3.2: відступ списку під absolute хедером. PENDING

## Етапи
- Етап 1: BOOK-1.2 ✅
- Етап 2: READ-1.2 ✅
- Етап 3: READ-1.3 ✅
- Етап 4: READ-1.4 ✅
- Етап 5: DICT-3.2 (відступ списку)
- Етап 6: БІЛД (по команді)
