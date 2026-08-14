# FORMATS ROUND — підтримка всіх форматів

Зараз: TXT, EPUB, FB2. Треба додати DOCX, ODT, RTF, HTML.
(PDF/MOBI — важкі нативні залежності, окремо.)

## Статус
- [ ] DOCX: zip → word/document.xml, витяг <w:t>. PENDING
- [ ] ODT: zip → content.xml. PENDING
- [ ] RTF: regex strip. PENDING
- [ ] HTML: stripHtml. PENDING
- [ ] LibraryScreen: format switch + імпорт усіх. PENDING

## Етапи
- Етап 1: DOCX parser
- Етап 2: ODT parser
- Етап 3: RTF parser
- Етап 4: HTML parser
- Етап 5: format switch у LibraryScreen
- Етап 6: tsc + коміт
- Етап 7: БІЛД (по команді, разом з Round 3)
