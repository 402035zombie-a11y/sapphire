// Verify utils/translations.ts — splitTranslations & matchAnyTranslation

function splitTranslations(rawTranslation) {
  if (!rawTranslation) return [];
  const parts = rawTranslation
    .split(/[,;/|\n\r]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const unique = [];
  const seen = new Set();
  for (const p of parts) {
    const norm = p.toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      unique.push(p);
    }
  }
  return unique.length > 0 ? unique : [rawTranslation.trim()];
}

function matchAnyTranslation(userAnswer, expectedTranslation) {
  if (!userAnswer || !expectedTranslation) return false;
  const normUser = userAnswer.trim().toLowerCase().replace(/[.,!?;:]/g, '');
  if (!normUser) return false;
  const variants = splitTranslations(expectedTranslation);
  return variants.some((v) => {
    const normV = v.trim().toLowerCase().replace(/[.,!?;:]/g, '');
    return normV === normUser;
  });
}

const tests = [
  { fn: 'splitTranslations', input: 'good, excellent; ok / fine', expected: ['good', 'excellent', 'ok', 'fine'] },
  { fn: 'splitTranslations', input: 'single', expected: ['single'] },
  { fn: 'splitTranslations', input: '', expected: [] },
  { fn: 'splitTranslations', input: '  ', expected: [] },
  { fn: 'splitTranslations', input: 'a, a, b', expected: ['a', 'b'] },
  { fn: 'splitTranslations', input: 'a;b|c\nd', expected: ['a', 'b', 'c', 'd'] },
  { fn: 'splitTranslations', input: 'hello, world; foo/bar', expected: ['hello', 'world', 'foo', 'bar'] },
  { fn: 'matchAnyTranslation', input: ['good', 'good, excellent; ok / fine'], expected: true },
  { fn: 'matchAnyTranslation', input: ['excellent', 'good, excellent; ok / fine'], expected: true },
  { fn: 'matchAnyTranslation', input: ['ok', 'good, excellent; ok / fine'], expected: true },
  { fn: 'matchAnyTranslation', input: ['fine', 'good, excellent; ok / fine'], expected: true },
  { fn: 'matchAnyTranslation', input: ['bad', 'good, excellent; ok / fine'], expected: false },
  { fn: 'matchAnyTranslation', input: ['Good', 'good, excellent; ok / fine'], expected: true },
  { fn: 'matchAnyTranslation', input: ['good.', 'good, excellent; ok / fine'], expected: true },
  { fn: 'matchAnyTranslation', input: ['  good  ', 'good, excellent; ok / fine'], expected: true },
  { fn: 'matchAnyTranslation', input: ['', 'good'], expected: false },
  { fn: 'matchAnyTranslation', input: ['good', ''], expected: false },
];

let passed = 0, failed = 0;
for (const t of tests) {
  let result;
  if (t.fn === 'splitTranslations') result = splitTranslations(t.input);
  else result = matchAnyTranslation(t.input[0], t.input[1]);
  const ok = JSON.stringify(result) === JSON.stringify(t.expected);
  if (ok) { console.log(`✓ ${t.fn}(${JSON.stringify(t.input)}) => ${JSON.stringify(result)}`); passed++; }
  else { console.log(`✗ ${t.fn}(${JSON.stringify(t.input)}) => ${JSON.stringify(result)} (expected ${JSON.stringify(t.expected)})`); failed++; }
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
