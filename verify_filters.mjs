// Verify DictionaryScreen filter/sort/due logic (extracted and adapted to pure JS)

// Simulated data matching DictionaryEntry + TrainingProgress
const mockEntries = [
  { id: '1', word: 'apple', surfaceForm: 'apple', translation: 'яблуко', context: '', lang: 'en', bookId: 'b1', frequency: 5, createdAt: 1000 },
  { id: '2', word: 'banana', surfaceForm: 'banana', translation: 'банан', context: '', lang: 'en', bookId: 'b1', frequency: 3, createdAt: 2000 },
  { id: '3', word: 'cherry', surfaceForm: 'cherry', translation: 'вишня', context: '', lang: 'en', bookId: 'b2', frequency: 1, createdAt: 3000 },
  { id: '4', word: 'dog', surfaceForm: 'dog', translation: 'собака', context: '', lang: 'en', bookId: null, frequency: 10, createdAt: 4000 },
  { id: '5', word: 'elephant', surfaceForm: 'elephant', translation: 'слон', context: '', lang: 'fr', bookId: 'b1', frequency: 2, createdAt: 5000 },
  { id: '6', word: 'fish', surfaceForm: 'fish', translation: '', context: '', lang: 'en', bookId: 'b2', frequency: 1, createdAt: 6000 }, // no translation
];

// Mock training progress (levelOf + nextReviewAt)
const now = Date.now();
const day = 86400000;
const mockProgress = {
  'apple|en': { box: 5, correctCount: 50, wrongCount: 0, nextReviewAt: now + 30*day, stability: 30, difficulty: 3, lastReview: now - 5*day }, // learned
  'banana|en': { box: 3, correctCount: 10, wrongCount: 2, nextReviewAt: now + 2*day, stability: 6, difficulty: 5, lastReview: now - 1*day }, // learning
  'cherry|en': { box: 1, correctCount: 0, wrongCount: 0, nextReviewAt: now - 1*day, stability: 0.5, difficulty: 7, lastReview: 0 }, // new (overdue)
  'dog|en': { box: 4, correctCount: 20, wrongCount: 5, nextReviewAt: now + 5*day, stability: 14, difficulty: 6, lastReview: now - 3*day }, // learning
  'elephant|fr': { box: 2, correctCount: 1, wrongCount: 0, nextReviewAt: now + 1*day, stability: 2, difficulty: 8, lastReview: now - 0.5*day }, // learning
  'fish|en': { box: 1, correctCount: 0, wrongCount: 0, nextReviewAt: now - 2*day, stability: 0.5, difficulty: 7, lastReview: 0 }, // new (overdue)
};

function levelOf(word, lang) {
  const p = mockProgress[`${word}|${lang}`];
  if (!p) return 'new';
  if ((p.stability ?? 0) >= 21) return 'learned';
  return 'learning';
}

function dueFilter(word, lang, filter) {
  const p = mockProgress[`${word}|${lang}`];
  if (!p) return false;
  if (filter === 'overdue') return p.nextReviewAt <= now;
  if (filter === 'today') return p.nextReviewAt > now && p.nextReviewAt <= now + day;
  if (filter === 'week') return p.nextReviewAt > now + day && p.nextReviewAt <= now + 7*day;
  return true; // 'all'
}

// --- SORT LOGIC (from DictionaryScreen) ---
function sortEntries(entries, sortBy) {
  const list = [...entries];
  list.sort((a, b) => {
    if (sortBy === 'az') return a.word.localeCompare(b.word);
    if (sortBy === 'lang') return a.lang.localeCompare(b.lang) || a.word.localeCompare(b.word);
    if (sortBy === 'freq') return (b.frequency ?? 1) - (a.frequency ?? 1);
    if (sortBy === 'hard') {
      const pa = mockProgress[`${a.word}|${a.lang}`];
      const pb = mockProgress[`${b.word}|${b.lang}`];
      const scoreA = (pa?.wrongCount ?? 0) * 10 - (pa?.stability ?? 0);
      const scoreB = (pb?.wrongCount ?? 0) * 10 - (pb?.stability ?? 0);
      return scoreB - scoreA;
    }
    // date — newest first
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
  return list;
}

// --- FILTER LOGIC ---
function filterEntries(entries, query, levelFilter, dueFilterMode) {
  let list = [...entries];
  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter(e => (e.word || '').toLowerCase().includes(q) || (e.translation || '').toLowerCase().includes(q));
  }
  if (levelFilter !== 'all') {
    list = list.filter(e => levelOf(e.word, e.lang) === levelFilter);
  }
  if (dueFilterMode !== 'all') {
    list = list.filter(e => dueFilter(e.word, e.lang, dueFilterMode));
  }
  return list;
}

// --- TESTS ---
console.log('=== SORT TESTS ===');
// az: apple, banana, cherry, dog, elephant, fish
console.log('az:', sortEntries(mockEntries, 'az').map(e => e.word).join(', '));
// date: fish(6000), elephant(5000), dog(4000), cherry(3000), banana(2000), apple(1000)
console.log('date:', sortEntries(mockEntries, 'date').map(e => e.word).join(', '));
// lang: en then fr; within en: az: apple, banana, cherry, dog, fish
console.log('lang:', sortEntries(mockEntries, 'lang').map(e => e.word + '(' + e.lang + ')').join(', '));
// freq: dog(10), apple(5), banana(3), elephant(2), cherry(1), fish(1)
console.log('freq:', sortEntries(mockEntries, 'freq').map(e => e.word + '(' + e.frequency + ')').join(', '));
// hard: wrongCount * 10 - stability
// cherry: 0*10-0.5=-0.5, banana: 2*10-6=14, dog: 5*10-14=36, fish: 0*10-0.5=-0.5, elephant: 0*10-2=-2, apple: 0*10-30=-30
// hardest (highest score first): dog(36), banana(14), cherry(-0.5), fish(-0.5), elephant(-2), apple(-30)
console.log('hard:', sortEntries(mockEntries, 'hard').map(e => {
  const p = mockProgress[`${e.word}|${e.lang}`];
  const score = (p?.wrongCount ?? 0) * 10 - (p?.stability ?? 0);
  return e.word + '(' + score + ')';
}).join(', '));

console.log('\n=== LEVEL FILTER TESTS ===');
console.log('all:', filterEntries(mockEntries, '', 'all', 'all').map(e => e.word).join(', '));
console.log('new:', filterEntries(mockEntries, '', 'new', 'all').map(e => e.word).join(', '));
console.log('learning:', filterEntries(mockEntries, '', 'learning', 'all').map(e => e.word).join(', '));
console.log('learned:', filterEntries(mockEntries, '', 'learned', 'all').map(e => e.word).join(', '));

console.log('\n=== DUE FILTER TESTS ===');
console.log('all:', filterEntries(mockEntries, '', 'all', 'all').map(e => e.word).join(', '));
console.log('overdue (cherry, fish):', filterEntries(mockEntries, '', 'all', 'overdue').map(e => e.word).join(', '));
console.log('today (elephant):', filterEntries(mockEntries, '', 'all', 'today').map(e => e.word).join(', '));
console.log('week (banana, dog):', filterEntries(mockEntries, '', 'all', 'week').map(e => e.word).join(', '));

console.log('\n=== SEARCH TESTS ===');
console.log('query "an" (banana):', filterEntries(mockEntries, 'an', 'all', 'all').map(e => e.word).join(', '));
console.log('query "dog" (dog):', filterEntries(mockEntries, 'dog', 'all', 'all').map(e => e.word).join(', '));

console.log('\n=== COMBINED TESTS ===');
console.log('level=new + sort=az:', filterEntries(mockEntries, '', 'new', 'all').map(e => e.word).join(', '));
console.log('due=overdue + sort=freq:', sortEntries(filterEntries(mockEntries, '', 'all', 'overdue'), 'freq').map(e => e.word + '(' + e.frequency + ')').join(', '));

console.log('\nAll filter/sort/due logic tests completed.');
