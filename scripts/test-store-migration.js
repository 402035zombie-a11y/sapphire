// scripts/test-store-migration.js
// Перевіряє one-time міграцію legacy-ключів (bookreader-* -> sapphire-*)
// у РЕАЛЬНОМУ store/createStore.ts через babel-бандл.
// Запуск: node scripts/test-store-migration.js
const FS = require('fs');
const PATH = require('path');
const Module = require('module');
const { transformSync } = require('@babel/core');

const ROOT = PATH.resolve(__dirname, '..');
const B = PATH.join(ROOT, 'node_modules', '.cache-migration-test');

// --- stateful mock AsyncStorage ---
const backing = new Map();
const fakeAsyncStorage = {
  getItem: async (k) => (backing.has(k) ? backing.get(k) : null),
  setItem: async (k, v) => { backing.set(k, v); },
  removeItem: async (k) => { backing.delete(k); },
  multiGet: async () => [],
  multiSet: async () => {},
  multiRemove: async () => {},
  length: backing.size,
};
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@react-native-async-storage/async-storage') return fakeAsyncStorage;
  return originalLoad.apply(this, arguments);
};

// --- bundle the REAL createStore.ts ---
const outRel = 'store/createStore.js';
FS.mkdirSync(PATH.join(B, 'store'), { recursive: true });
const code = FS.readFileSync(PATH.join(ROOT, 'store/createStore.ts'), 'utf8');
const out = transformSync(code, {
  filename: PATH.join(ROOT, 'store/createStore.ts'),
  presets: ['@babel/preset-typescript'],
  generatorOpts: { compact: false },
});
FS.writeFileSync(PATH.join(B, outRel), out.code, 'utf8');
const { persist } = require(PATH.join(B, outRel));

const LEGACY = 'persist:bookreader-settings';
const NEW = 'persist:sapphire-settings';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (label, cond) => {
  if (cond) { pass++; console.log('  OK   ' + label); }
  else { fail++; console.log('  FAIL ' + label); }
};

(async () => {
  // --- CASE 1: legacy exists, new absent -> must copy ---
  console.log('CASE 1: legacy key present, new key absent');
  backing.clear();
  const legacyPayload = JSON.stringify({ theme: 'night', fontSize: 16, targetLang: 'en' });
  backing.set(LEGACY, legacyPayload);

  const creator1 = (set, get) => ({
    theme: 'light', fontSize: 14, targetLang: 'uk',
    setTheme: (t) => set({ theme: t }),
  });
  const s1 = persist(creator1, { name: 'sapphire-settings', legacyName: 'bookreader-settings' });
  await sleep(50);

  check('legacy key copied to new key', backing.get(NEW) === legacyPayload);
  check('legacy key NOT deleted', backing.get(LEGACY) === legacyPayload);
  check('state rehydrated from legacy', s1.getState().theme === 'night');
  check('state rehydrated fontSize', s1.getState().fontSize === 16);

  // --- CASE 2: new key already exists -> must NOT overwrite ---
  console.log('CASE 2: new key already present (must win, no overwrite)');
  backing.clear();
  backing.set(LEGACY, JSON.stringify({ theme: 'night', fontSize: 16 }));
  backing.set(NEW, JSON.stringify({ theme: 'blackout', fontSize: 20 }));

  const creator2 = (set, get) => ({ theme: 'light', fontSize: 14 });
  const s2 = persist(creator2, { name: 'sapphire-settings', legacyName: 'bookreader-settings' });
  await sleep(50);

  check('new key unchanged (blackout kept)', s2.getState().theme === 'blackout');
  check('new key fontSize kept', s2.getState().fontSize === 20);
  check('new key raw unchanged', backing.get(NEW) === JSON.stringify({ theme: 'blackout', fontSize: 20 }));

  // --- CASE 3: neither key exists -> no crash, defaults kept ---
  console.log('CASE 3: no keys at all');
  backing.clear();
  const creator3 = (set, get) => ({ theme: 'light', fontSize: 14 });
  const s3 = persist(creator3, { name: 'sapphire-settings', legacyName: 'bookreader-settings' });
  await sleep(50);
  check('defaults kept', s3.getState().theme === 'light' && s3.getState().fontSize === 14);
  check('no write to new key', !backing.has(NEW));

  // --- CASE 4: no legacyName option -> behaves as before (no migration) ---
  console.log('CASE 4: no legacyName option -> legacy ignored');
  backing.clear();
  backing.set(LEGACY, JSON.stringify({ theme: 'night' }));
  const creator4 = (set, get) => ({ theme: 'light' });
  const s4 = persist(creator4, { name: 'sapphire-settings' });
  await sleep(50);
  check('defaults kept (no migration)', s4.getState().theme === 'light');
  check('legacy not copied', !backing.has(NEW));

  // --- CASE 5: corrupt legacy JSON -> must not crash, defaults kept ---
  console.log('CASE 5: corrupt legacy JSON');
  backing.clear();
  backing.set(LEGACY, '{not json');
  const creator5 = (set, get) => ({ theme: 'light', fontSize: 14 });
  const s5 = persist(creator5, { name: 'sapphire-settings', legacyName: 'bookreader-settings' });
  await sleep(50);
  check('no crash, defaults kept', s5.getState().theme === 'light');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
})();
