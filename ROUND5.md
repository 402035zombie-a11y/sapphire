# ROUND 5 — OPTIMIZATION (після форматів, tsc=0)

Користувач: 1000+ слів у словник → 5с freeze + лаги; відкриття великої книги → freeze.

## Знайдені anti-patterns (за rn-best-practices)
- DictionaryScreen:219 цикл addEntry ×1000 → persist пише весь словник 1000× → FREEZE.
- DictionaryScreen:333 ScrollView для списку слів (1000+) → треба FlatList.
- StyleSheet.create у тілі компонента: Dictionary:593, Library:594, Reader:561,
  Bookmarks:87, SpeedReading:482, Sections:79, FontSettings:222, QuizCard:119 → реалокація щорендеру.
- React.memo відсутній на SentenceRow (Reader:235 коментар "ламає memo").
- Persist libraryStore при setDraft великої книги → повільний запис.

## Статус
- [ ] PERF-1: DictionaryScreen батч-імпорт (importEntries замість циклу addEntry). PENDING
- [ ] PERF-2: DictionaryScreen ScrollView→FlatList для слів. PENDING
- [ ] PERF-3: StyleSheet.create → useMemo/hoist у hot screens. PENDING
- [ ] PERF-4: React.memo SentenceRow (fix handler stability). PENDING
- [ ] PERF-5: ReaderScreen відкриття книги freeze. PENDING

## Етапи
- Етап 1: PERF-1 (критичний freeze)
- Етап 2: PERF-2
- Етап 3: PERF-3
- Етап 4: PERF-4
- Етап 5: PERF-5
- Етап 6: tsc + коміт
- Етап 7: БІЛД (по команді)
