/**
 * readerSentences.ts — ОДИН прохід розбиття книги + кеш на перевідкриття.
 *
 * Корінь лагу відкриття (виміряно scripts/bench-book-open.js):
 * ReaderScreen робив splitIntoSegments() ЧОТИРИ рази на одну книгу — у memo `chapters`,
 * у memo `sentences`, в `paraToFirstSentence` і в `prefetchAhead` (на кожному скрол-стопі).
 * Усі ці проходи давали байт-у-байт той самий результат (доведено: CONTENT identical = YES),
 * тобто була марна робота на кожному рендері та на кожному скролі.
 *
 * 2MB книга / 15 433 речення:  3 проходи = 296 ms, 1 прохід = 105 ms (desktop).
 * На пристрої (~6× повільніший JS) це ~1.8s проти ~0.6s блокування потока.
 *
 * Другий множник: кеш. Кожне перевідкриття тієї самої книги перечитувало БД
 * і різало текст заново. Тепер результат береться з кеша (bounded, 3 книги).
 *
 * ВАЖЛИВО: `sentences[].index` — це ключ `skey` у таблиці sentence_translations.
 * Тому індекси формуються ТОЧНО за старою формулою: p.index * 1000 + si.
 */
import { getBookChapters } from './bookImport';
import { stripHtmlToText } from './bookText';
import { splitIntoSegments } from '../utils/sentenceSplitter';
import { useLibraryStore } from '../store/libraryStore';

export interface ReaderParagraph {
  index: number;
  original: string;
}

export interface ReaderSentence {
  original: string;
  paragraphIndex: number;
  sentenceIndex: number;
  index: number;
}

export interface ReaderSentences {
  /** Абзаци-речення (те, що раніше називалось `chapters` у ReaderScreen). */
  paragraphs: ReaderParagraph[];
  /** Плоский список речень для FlatList. */
  sentences: ReaderSentence[];
  /** paragraphIndex -> позиція першого речення у плоскому списку. */
  paraToFirstSentence: Record<number, number>;
  /** paragraphIndex -> вже розбиті сегменти. Прибирає повторні розбиття в скролі. */
  segmentsByParagraph: Record<number, string[]>;
  /** Чи книга має глави в БД (false = fallback на libraryStore.paragraphs). */
  fromDb: boolean;
}

const MAX_CACHED = 3;
const cache = new Map<string, ReaderSentences>();
const keys: string[] = [];

/** Скинути кеш (однієї книги за bookId, або весь — без аргумента). */
export function clearReaderSentencesCache(bookId?: string): void {
  for (const k of Array.from(cache.keys())) {
    const owned = bookId === undefined || k.startsWith(bookId + ':');
    if (owned) {
      cache.delete(k);
      const i = keys.indexOf(k);
      if (i >= 0) keys.splice(i, 1);
    }
  }
}

/**
 * Будує структури читача за ОДИН прохід: глави → stripHtml → splitIntoSegments,
 * і лише потім сумами формує `sentences` та `paraToFirstSentence` (O(n), без регексів).
 *
 * @param bookId   id книги
 * @param version  токен інвалідатора (напр. dbVersion у ReaderScreen). Зміна версії
 *                 гарантує перерахунок після self-heal реімпорту книги.
 */
export function getReaderSentences(bookId: string, version: number = 0): ReaderSentences {
  const key = `${bookId}:${version}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const built = buildReaderSentences(bookId);
  cache.set(key, built);
  keys.push(key);
  while (keys.length > MAX_CACHED) {
    cache.delete(keys.shift() as string);
  }
  return built;
}

function buildReaderSentences(bookId: string): ReaderSentences {
  const dbChapters = getBookChapters(bookId);
  const paragraphs: ReaderParagraph[] = [];
  const segmentsByParagraph: Record<number, string[]> = {};

  if (dbChapters.length === 0) {
    // Legacy fallback: текст у libraryStore.paragraphs. Тут один paragraph = ціла
    // глава (див. getBookParagraphs), тому розбиття СПРАВДІ потрібне.
    const storeBook = useLibraryStore.getState().books.find((b) => b.id === bookId);
    if (storeBook?.paragraphs?.length) {
      for (const p of storeBook.paragraphs) {
        segmentsByParagraph[p.index] = splitIntoSegments(p.original);
        paragraphs.push({ index: p.index, original: p.original });
      }
    }
    return buildDerived(paragraphs, segmentsByParagraph, false);
  }

  // Швидкий шлях: глава в БД → strip → split. Один прохід на всю книгу.
  for (const ch of dbChapters) {
    const plain = stripHtmlToText(ch.contentHtml);
    const segs = splitIntoSegments(plain);
    let si = 0;
    for (const s of segs) {
      if (s) {
        const idx = ch.idx * 1000 + si;
        paragraphs.push({ index: idx, original: s });
        segmentsByParagraph[idx] = [s]; // вже розбито — повторно не ріжемо
        si++;
      }
    }
  }
  return buildDerived(paragraphs, segmentsByParagraph, true);
}

function buildDerived(
  paragraphs: ReaderParagraph[],
  segmentsByParagraph: Record<number, string[]>,
  fromDb: boolean,
): ReaderSentences {
  const sentences: ReaderSentence[] = [];
  const paraToFirstSentence: Record<number, number> = {};
  let sentenceIdx = 0;

  for (const p of paragraphs) {
    paraToFirstSentence[p.index] = sentenceIdx;
    const segs = segmentsByParagraph[p.index] ?? [p.original];
    for (let si = 0; si < segs.length; si++) {
      sentences.push({
        original: segs[si],
        paragraphIndex: p.index,
        sentenceIndex: si,
        index: p.index * 1000 + si, // ключ skey у sentence_translations — формула збережена
      });
    }
    sentenceIdx += segs.length;
  }

  return { paragraphs, sentences, paraToFirstSentence, segmentsByParagraph, fromDb };
}
