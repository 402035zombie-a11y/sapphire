// services/bookDictionaryService.ts
// Пакетный перевод топ-N слов книги для заливки в словарь.
// Чанки по 20 слов, последовательно, с паузой — чтобы не триггерить лимиты googleGtx.
import { translate } from './translationService';
import type { DictionaryEntry } from '../store/dictionaryStore';
import { extractBookWords } from '../utils/bookWords';
import { effectiveLang } from '../utils/lang';
import { getAllBookSentenceTranslations } from './sentenceTranslationsDb';

const CHUNK = 20;
const PAUSE_MS = 150;
const SEP = '\n';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Находим первое предложение книги, содержащее слово (для контекста карточки).
function findContext(paragraphs: { original: string }[], word: string): string {
  const w = word.toLowerCase();
  for (const p of paragraphs) {
    if (p.original.toLowerCase().includes(w)) return p.original.slice(0, 200);
  }
  return '';
}

export async function buildBookDictionary(
  paragraphs: { original: string }[],
  lang: string,
  targetLang: string,
  opts: { limit?: number; bookId?: string; onProgress?: (p: number) => void } = {},
): Promise<Omit<DictionaryEntry, 'id' | 'createdAt'>[]> {
  const from = effectiveLang(lang);
  const words = extractBookWords(paragraphs);
  if (words.length === 0) return [];

  // Перевикористання збережених sentence_translations: якщо речення книги вже перекладені
  const sentenceTrans = opts.bookId ? getAllBookSentenceTranslations(opts.bookId) : [];
  const sentenceTransMap = new Map<number, string>();
  sentenceTrans.forEach((st) => {
    const num = Number(st.key);
    if (!Number.isNaN(num)) sentenceTransMap.set(num, st.translation);
  });

  const out: Omit<DictionaryEntry, 'id' | 'createdAt'>[] = [];
  for (let i = 0; i < words.length; i += CHUNK) {
    const chunk = words.slice(i, i + CHUNK);
    const joined = chunk.map((w) => w.word).join(SEP);
    try {
      const res = await translate(joined, from, targetLang);
      const parts = res.text.split(SEP).map((s) => s.trim());
      chunk.forEach((c, idx) => {
        const translation = parts[idx] ?? c.word;
        out.push({
          word: c.word,
          surfaceForm: c.word,
          translation,
          context: findContext(paragraphs, c.word),
          lang: from,
          bookId: opts.bookId,
          frequency: c.frequency,
        });
      });
    } catch {
      // при ошибке перевода чанка — всё равно кладём слово с пустым переводом
      chunk.forEach((c) => {
        out.push({
          word: c.word,
          surfaceForm: c.word,
          translation: '',
          context: findContext(paragraphs, c.word),
          lang: from,
          bookId: opts.bookId,
          frequency: c.frequency,
        });
      });
    }
    opts.onProgress?.(Math.min(1, (i + CHUNK) / words.length));
    if (i + CHUNK < words.length) await sleep(PAUSE_MS);
  }
  return out;
}
