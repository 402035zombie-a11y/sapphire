# BUGS ROUND 3 — канбан (білд по команді "білд")

Після білду ff7edbff + фіксів:
1. BOOK-1.2: LanguagePicker список обрізався. ✅ a7f9b2c
2. READ-1.2: слова накладаються (lh1.7→1.8, mr3→6, +letterSpacing0.3). ✅ 7032c1a
   АЛЕ після READ-1.2 юзер приніс скрін: слова ПОВНІСТЮ злиплися
   (meticulouslyanalyzedthe) — пробіли ЗНИКЛИ. Root cause: letterSpacing:0.3
   у baseText ламає пробіли у вкладених <Text> на нативі (відомий RN баг).
3. READ-1.3: прибрати letterSpacing (він зламав пробіли). PENDING

## Статус
- [x] BOOK-1.2 ✅ a7f9b2c
- [x] READ-1.2 ✅ 7032c1a
- [ ] READ-1.3: прибрати letterSpacing (повернути пробіли). PENDING

## Етапи
- Етап 1: BOOK-1.2 ✅
- Етап 2: READ-1.2 ✅
- Етап 3: READ-1.3 (прибрати letterSpacing)
- Етап 4: БІЛД (по команді)
