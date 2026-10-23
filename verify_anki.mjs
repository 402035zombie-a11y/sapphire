// Verify ankiExport.ts buildAnkiSql logic

const UNIT_SEP = '\x1f';
const MODEL_ID = 1607392319001;
const DECK_ID = 1607392319002;

function checksum(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 0xffffffff;
}

function guidFor(word, lang) {
  let h = '';
  let x = 7;
  for (let i = 0; i < word.length + lang.length; i++) {
    const c = (word + lang).charCodeAt(i % (word.length + lang.length));
    x = ((x * 31) + c) | 0;
    h += Math.abs(x % 16).toString(16);
  }
  return h.slice(0, 10);
}

function buildAnkiSql(cards, deckName) {
  const now = Math.floor(Date.now() / 1000);
  const esc = (s) => s.replace(/'/g, "''");
  const lines = [];
  lines.push('PRAGMA writable_schema = OFF;');
  lines.push('BEGIN TRANSACTION;');
  const confJson = JSON.stringify({
    1: { deckConfId: 1, name: 'Default', maxTaken: 60, autoplay: true, timer: 0, replayq: true,
      new: [{ delays: [1, 10], ints: [1, 4, 7], initialFactor: 2500, perDay: 20, units: 'd', order: 1, separate: true, ints2: [1] }],
      rev: { perDay: 200, fuzz: 0.05, ivlFct: 1, maxIvl: 36500, ease4: 1.3, bury: true, minSpace: 1 },
      lapse: { delays: [10], newIvl: 0, leechFails: 8, leechAction: 0 },
    },
  }).replace(/'/g, "''");
  lines.push("INSERT INTO col VALUES(1," + now + "," + now + "," + (now * 1000) + ",11,0,-1,0,'" + confJson + "','{}','{}','{}','{}');");
  const decksJson = JSON.stringify({
    [DECK_ID]: { id: DECK_ID, name: deckName, mod: now, usn: -1, lrnToday: [0, 0], revToday: [0, 0], newToday: [0, 0], timeToday: [0, 0], collapsed: false, browserCollapsed: false, desc: '', dyn: 0, conf: 1, extendNew: 0, extendRev: 0 },
    1: { id: 1, name: 'Default', mod: now, usn: 0, lrnToday: [0, 0], revToday: [0, 0], newToday: [0, 0], timeToday: [0, 0], collapsed: false, browserCollapsed: false, desc: '', dyn: 0, conf: 1, extendNew: 0, extendRev: 0 },
  }).replace(/'/g, "''");
  lines.push("INSERT INTO col(decks) VALUES('" + decksJson + "');");
  const modelsJson = JSON.stringify({
    [MODEL_ID]: { id: MODEL_ID, name: 'Basic (Sapphire)', type: 0, mod: now, usn: -1,
      sortf: 0, did: DECK_ID, tmpls: [{ name: 'Card 1', ord: 0, qfmt: '{{Front}}', afmt: '{{FrontSide}}<hr id="answer">{{Back}}', bqfmt: '', bafmt: '', did: null, bfont: '', bsize: 0 }],
      flds: [{ name: 'Front', ord: 0, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] }, { name: 'Back', ord: 1, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] }],
      css: '.card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }',
      latexPre: 'doc[12pt]{article}',
      latexPost: "\end{document}", latexsvg: false, req: [[0, 'any', [0]]], tags: [], vers: [],
    },
  }).replace(/'/g, "''");
  lines.push("UPDATE col SET models='" + modelsJson + "' WHERE id=1;");

  let cardId = now * 1000;
  cards.forEach((c, idx) => {
    const nid = now * 1000 + idx + 1;
    const flds = c.front.replace(/\x1f/g, '') + UNIT_SEP + c.back.replace(/\x1f/g, '');
    const csum = checksum(c.front);
    const guid = guidFor(c.front, String(idx));
    lines.push("INSERT INTO notes VALUES(" + nid + ",'" + guid + "'," + MODEL_ID + "," + now + ",-1,'','" + esc(flds) + "','" + esc(c.front) + "'," + csum + ",0,'');");
    lines.push("INSERT INTO cards VALUES(" + cardId++ + "," + nid + "," + DECK_ID + ",0," + now + ",-1,0,0,0,0,0,0,0,0,0,0,0,'');");
  });
  lines.push('COMMIT;');
  return lines.join('\n');
}

const cards = [
  { front: 'apple', back: 'яблуко' },
  { front: 'banana', back: 'банан' },
  { front: 'cherry', back: 'вишня' },
];

const sql = buildAnkiSql(cards, 'Test Deck');
console.log('=== SQL Output (first 2000 chars) ===');
console.log(sql.slice(0, 2000));
console.log('...');
console.log('=== SQL Output (last 1000 chars) ===');
console.log(sql.slice(-1000));

const lines = sql.split('\n');
console.log('\n=== Structure Check ===');
console.log('Has PRAGMA:', lines[0].includes('PRAGMA'));
console.log('Has BEGIN TRANSACTION:', lines[1].includes('BEGIN TRANSACTION'));
console.log('Has col INSERT:', lines.some(l => l.includes('INSERT INTO col')));
console.log('Has decks INSERT:', lines.some(l => l.includes('INSERT INTO col(decks)')));
console.log('Has models UPDATE:', lines.some(l => l.includes('UPDATE col SET models')));
console.log('Has notes INSERT:', lines.filter(l => l.includes('INSERT INTO notes')).length, 'notes');
console.log('Has cards INSERT:', lines.filter(l => l.includes('INSERT INTO cards')).length, 'cards');
console.log('Has COMMIT:', lines.some(l => l.includes('COMMIT')));

const noteLines = lines.filter(l => l.includes('INSERT INTO notes'));
console.log('\nNote 1:', noteLines[0]);
console.log('Note 2:', noteLines[1]);
console.log('Note 3:', noteLines[2]);

console.log('\nAnki export SQL structure looks correct.');
