/**
 * bench-book-open.js — вимірює реальну вартість відкриття книги.
 * Код беремо ВЕРБАТИМ з продакшен-файлів (source-slice), тому цифри = реальні.
 * Міряє: stripHtmlToText + splitIntoSegments (1 прохід) vs поточний шлях ReaderScreen (3 проходи).
 */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const ROOT = 'C:/Users/DELL/Sapphire';

// --- 1. stripHtmlToText: verbatim slice from services/bookText.ts (pure function) ---
const bookTextSrc = fs.readFileSync(path.join(ROOT, 'services/bookText.ts'), 'utf8');
const stripMatch = bookTextSrc.match(/export function stripHtmlToText[\s\S]*?\n\}/);
if (!stripMatch) throw new Error('stripHtmlToText not found in bookText.ts');
// The slice is a verbatim copy of production source (no interpolation) -> safe to eval.
const stripCode = babel.transformSync(stripMatch[0], {
  filename: 'stripHtmlToText.ts',
  presets: [['@babel/preset-typescript', {}]],
  plugins: [['@babel/plugin-transform-modules-commonjs', {}]],
  configFile: false, babelrc: false,
}).code;
const stripHtmlToText = new Function('exports', stripCode + '; return exports.stripHtmlToText;')({});

// --- 2. sentenceSplitter.ts: pure module, load via babel ---
const splitterSrc = fs.readFileSync(path.join(ROOT, 'utils/sentenceSplitter.ts'), 'utf8');
const splitterCode = babel.transformSync(splitterSrc, {
  filename: 'sentenceSplitter.ts',
  presets: [['@babel/preset-typescript', {}]],
  plugins: [['@babel/plugin-transform-modules-commonjs', {}]],
  configFile: false, babelrc: false,
}).code;
const sm = { exports: {} };
new Function('module', 'exports', splitterCode)(sm, sm.exports);
const { splitIntoSegments, splitIntoSentences } = sm.exports;

console.log('loaded OK. stripHtmlToText=%s splitIntoSegments=%s splitIntoSentences=%s',
  typeof stripHtmlToText, typeof splitIntoSegments, typeof splitIntoSentences);

// --- 3. synthetic realistic book ---
function makeChapter(chars) {
  const paras = [];
  let made = 0;
  while (made < chars) {
    const n = 5 + Math.floor(Math.random() * 5);
    let p = '';
    for (let i = 0; i < n; i++) {
      const words = 8 + Math.floor(Math.random() * 14);
      let s = '';
      for (let w = 0; w < words; w++) {
        const word = 'word' + Math.floor(Math.random() * 9000);
        s += w === 0 ? word[0].toUpperCase() + word.slice(1) : word; // sentence starts capitalised
        s += ' ';
      }
      p += s.trim() + '. ';
    }
    paras.push('<p>' + p + '</p>');
    made += p.length;
  }
  return paras.join('\n');
}

const ms = (a, b) => Number(b - a) / 1e6;

for (const [label, totalChars] of [['small  ~200KB', 200_000], ['medium ~800KB', 800_000], ['large  ~2MB', 2_000_000]]) {
  const NCH = 10;
  const perCh = Math.floor(totalChars / NCH);
  const chs = [];
  for (let c = 0; c < NCH; c++) chs.push(makeChapter(perCh));
  const totalHtml = chs.reduce((a, b) => a + b.length, 0);

  // PATH A — one pass: strip + split
  let t0 = process.hrtime.bigint();
  let sentences1 = [];
  for (const html of chs) {
    const plain = stripHtmlToText(html);
    sentences1.push(...splitIntoSegments(plain));
  }
  let t1 = process.hrtime.bigint();

  // PATH B — current ReaderScreen: chapters pass + sentences pass + paraToFirstSentence pass
  let t2 = process.hrtime.bigint();
  const chapters = [];
  for (const html of chs) {
    const plain = stripHtmlToText(html);
    const segs = splitIntoSegments(plain);
    let si = 0;
    for (const s of segs) if (s) { chapters.push({ index: si, original: s }); si++; }
  }
  const sentences2 = [];
  for (const p of chapters) {
    const segs = splitIntoSegments(p.original); // PASS 2 (redundant)
    segs.forEach((s, si) => sentences2.push({ original: s, paragraphIndex: p.index, sentenceIndex: si, index: p.index * 1000 + si }));
  }
  const map = {};
  let idx = 0;
  for (const p of chapters) { map[p.index] = idx; idx += splitIntoSegments(p.original).length; } // PASS 3 (redundant)
  let t3 = process.hrtime.bigint();

  const a = ms(t0, t1), b = ms(t2, t3);
  console.log(`\n${label}  (html ${(totalHtml / 1048576).toFixed(2)}MB, ${sentences1.length} sentences, ${Object.keys(map).length} paragraphs)`);
  console.log(`  A) strip+split, 1 pass          : ${a.toFixed(1)} ms`);
  console.log(`  B) ReaderScreen current, 3 passes: ${b.toFixed(1)} ms`);
  console.log(`  -> redundant work                : ${(b - a).toFixed(1)} ms  (${(b / a).toFixed(2)}x)`);
  console.log(`  -> sentence counts A vs B        : ${sentences1.length} vs ${sentences2.length}`);
  // Content equality: proves a single-pass derivation is behaviour-preserving.
  let identical = sentences1.length === sentences2.length;
  if (identical) {
    for (let i = 0; i < sentences1.length; i++) {
      if (sentences1[i] !== sentences2[i].original) { identical = false; break; }
    }
  }
  console.log(`  -> CONTENT identical A==B?       : ${identical ? 'YES (safe to derive in 1 pass)' : 'NO (would change behaviour!)'}`);
}

// --- 4. isolate: which stage dominates? ---
console.log('\n--- stage breakdown (large book) ---');
{
  const NCH = 10, perCh = 200_000;
  const chs = [];
  for (let c = 0; c < NCH; c++) chs.push(makeChapter(perCh));

  let t = process.hrtime.bigint();
  const plains = chs.map((h) => stripHtmlToText(h));
  const tStrip = process.hrtime.bigint();

  const segs = [];
  for (const p of plains) segs.push(...splitIntoSegments(p));
  const tSplit = process.hrtime.bigint();

  let s0 = process.hrtime.bigint();
  let n = 0;
  for (const p of plains) n += splitIntoSentences(p).length;
  const s1 = process.hrtime.bigint();

  console.log(`  stripHtmlToText (10 chapters) : ${ms(t, tStrip).toFixed(1)} ms`);
  console.log(`  splitIntoSegments (10 chapters): ${ms(tStrip, tSplit).toFixed(1)} ms  (${segs.length} segs)`);
  console.log(`  splitIntoSentences alone      : ${ms(s0, s1).toFixed(1)} ms  (${n} raw sentences)`);
}
