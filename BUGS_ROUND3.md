# BUGS ROUND 3 — канбан (білд по команді "білд")

Після білду ff7edbff + фіксів:
1. BOOK-1.2 ✅ a7f9b2c
2. READ-1.2 ✅ 7032c1a
3. READ-1.3 ✅ 0950182
4. READ-1.4 ✅ 7b59dd7
5. DICT-3.2 ✅ 213ccca
6. TRAIN-3.1 ✅ 58612c8
7. EPUB-2: "Empty / Could not extract text" — parseEpub повертає
   порожній text (paragraphs=[]). Root cause: zip.file(href) null через
   подвійний шлях (opfDir + href що вже містить OEBPS/) або суворий
   порядок атрибутів у regex маніфесту. PENDING

## Статус
- [x] BOOK-1.2 ✅ a7f9b2c
- [x] READ-1.2 ✅ 7032c1a
- [x] READ-1.3 ✅ 0950182
- [x] READ-1.4 ✅ 7b59dd7
- [x] DICT-3.2 ✅ 213ccca
- [x] TRAIN-3.1 ✅ 58612c8
- [ ] EPUB-2: стійкий парсинг маніфесту + candidates шляхів. PENDING

## Етапи
- Етап 1-6: ✅
- Етап 7: EPUB-2 (fix zip path resolution)
- Етап 8: БІЛД (по команді)
