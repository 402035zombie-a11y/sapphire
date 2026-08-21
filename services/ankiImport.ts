// services/ankiImport.ts
// Імпорт Anki-колоди (.apkg) → DictionaryEntry[].
//
// .apkg = zip, всередині:
//   collection.anki2 — SQLite база (notes: flds = "front\x1fback")
//   media            — JSON мапа медіа (ігноруємо в v1)
//
// Стратегія: розпакувати zip (jszip) → зберегти collection.anki2 у SQLite dir →
// відкрити read-only через expo-sqlite → SELECT notes → flds split → entries.
// Підтримуємо і новий формат (.colpkg/zstd — НЕ підтримуємо, тільки класичний apkg).

import * as SQLite from 'expo-sqlite';
import JSZip from 'jszip';
import { DictionaryEntry } from '../store/dictionaryStore';

export interface ApkgImportResult {
  cards: { front: string; back: string }[];
  deckName: string;
}

/** Розібрати base64 .apkg → картки (front/back). */
export async function parseApkgBase64(b64: string): Promise<ApkgImportResult> {
  const zip = await JSZip.loadAsync(b64, { base64: true });

  const anki2File = zip.file('collection.anki2');
  if (!anki2File) {
    // нові колоди Anki 23+ використовують collection.anki21b (zstd) — не підтримується
    const anki21b = zip.file('collection.anki21b');
    if (anki21b) {
      throw new Error('This deck uses the new Anki format (zstd). Please export it with "support older Anki versions" checked.');
    }
    throw new Error('Invalid .apkg: collection.anki2 not found');
  }
  const dbB64 = await anki2File.async('base64');

  // Зберігаємо у SQLite-каталог і відкриваємо
  // @ts-ignore — legacy API
  const FileSystem = require('expo-file-system/legacy');
  const dbName = `anki-import-${Date.now()}.db`;
  const dbPath = `${FileSystem.documentDirectory}SQLite/${dbName}`;
  await FileSystem.writeAsStringAsync(dbPath, dbB64, { encoding: FileSystem.EncodingType.Base64 });

  let deckName = 'Anki import';
  const cards: { front: string; back: string }[] = [];
  let db: SQLite.SQLiteDatabase | null = null;
  try {
    db = SQLite.openDatabaseSync(dbName);

    // Назва колоди (перша не-Dynamic не-Default)
    try {
      const colRow = db.getFirstSync('SELECT decks FROM col WHERE id = 1') as { decks: string } | undefined;
      if (colRow?.decks) {
        const decks = JSON.parse(colRow.decks) as Record<string, { name: string; dyn?: number }>;
        const names = Object.values(decks)
          .filter((d) => d.name !== 'Default' && !d.dyn)
          .map((d) => d.name);
        if (names.length > 0) deckName = `Sapphire::${names[0].split('::').pop()}`;
      }
    } catch {}

    // Модель: визначити індекси полів Front/Back (щоб працювати з будь-якою моделлю)
    let frontIdx = 0;
    let backIdx = 1;
    try {
      const modelRow = db.getFirstSync('SELECT models FROM col WHERE id = 1') as { models: string } | undefined;
      if (modelRow?.models) {
        const models = JSON.parse(modelRow.models) as Record<string, { flds: { name: string; ord: number }[] }>;
        const firstModel = Object.values(models)[0];
        if (firstModel?.flds) {
          const f = firstModel.flds.find((f) => /front|term|word/i.test(f.name));
          const b = firstModel.flds.find((f) => /back|definition|translation|meaning/i.test(f.name));
          if (f) frontIdx = f.ord;
          if (b) backIdx = b.ord;
        }
      }
    } catch {}

    const rows = db.getAllSync('SELECT flds FROM notes') as { flds: string }[];
    for (const r of rows) {
      const fields = (r.flds || '').split('\x1f');
      const front = (fields[frontIdx] ?? '').replace(/<[^>]+>/g, '').trim();
      const back = (fields[backIdx] ?? '').replace(/<[^>]+>/g, '').trim();
      if (!front || !back) continue;
      // пропускаємо HTML-обгортки/порожні після strip
      cards.push({ front, back });
    }
  } finally {
    try { db?.closeSync(); } catch {}
    try { await FileSystem.deleteAsync(dbPath, { idempotent: true }); } catch {}
  }

  return { cards, deckName };
}

/** Конвертація карток у DictionaryEntry (без id/createdAt — їх ставить importEntries). */
export function toDictionaryEntries(
  cards: { front: string; back: string }[],
  lang: string,
): Omit<DictionaryEntry, 'id' | 'createdAt'>[] {
  return cards.map((c) => ({
    word: c.front,
    surfaceForm: c.front,
    translation: c.back,
    context: '',
    lang,
    frequency: 1,
  }));
}
