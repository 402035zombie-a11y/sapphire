/**
 * readerChunker.ts — R3: вертикальне чанкування книги на «сторінки» (чанки),
 * розмір яких підібраний під висоту в'юпорту (з урахуванням розширення перекладу),
 * + логіка визначення наступних чанків для префетчу перекладу.
 *
 * Горизонтальна пагінація ВИДАЛЕНА (юзер заборонив) — залишаємо ВЕРТИКАЛЬНИЙ скрол.
 * Чанки тут = одиниці планування префетчу перекладу, а не окремі екрани пагінації.
 *
 * Чиста логіка (без RN/store/network), щоб працювати швидко й не гальмувати
 * головний потік навіть на великих книгах (тільки арифметика по довжині тексту).
 */
import { BookParagraph } from '../store/libraryStore';

export interface Chunk {
  /** порядковий номер чанка */
  index: number;
  /** індекс першого абзацу у вихідному масиві paragraphs */
  start: number;
  /** індекс останнього абзацу (включно) */
  end: number;
  /** індекси всіх абзаців чанка */
  paragraphIndices: number[];
  /** оцінена кількість рядків (для діагностики/дебагу) */
  estLines: number;
}

export interface ChunkOptions {
  /** доступна висота під текст (px), без хедера/падінгів */
  viewportHeight: number;
  /** розмір шрифту (px) */
  fontSize: number;
  /** міжрядковий інтервал (множник, напр. 1.5) */
  lineHeight: number;
  /** оцінена кількість символів в одному рядку */
  charsPerLine: number;
  /** чи показуємо переклад під оригіналом (впливає на оцінку висоти) */
  showTranslation: boolean;
  /** коеф. розширення перекладу відносно оригіналу (напр. 1.3) */
  translateExpansion?: number;
  /** безпечний кап рядків на чанк (напр. 80) */
  maxChunkLines?: number;
}

/** Оцінити, скільки рядків займе абзац (з урахуванням перекладу). */
function estimateLines(p: BookParagraph, opts: ChunkOptions): number {
  const chars = p.original?.length ?? 0;
  const cpl = Math.max(1, opts.charsPerLine);
  let lines = Math.max(1, Math.ceil(chars / cpl));
  if (opts.showTranslation) {
    const exp = opts.translateExpansion ?? 1.3;
    lines += Math.max(1, Math.ceil((chars * exp) / cpl));
  }
  return lines;
}

/**
 * Розбити плоский список абзаців на чанки, що вміщаються у в'юпорт.
 * Абзац ніколи не розривається між чанками (його цілком кладемо в один).
 */
export function buildChunks(paragraphs: BookParagraph[], opts: ChunkOptions): Chunk[] {
  const lineHeightPx = Math.max(1, opts.fontSize * opts.lineHeight);
  const maxLines = opts.maxChunkLines ?? Math.max(1, Math.floor(opts.viewportHeight / lineHeightPx));
  const chunks: Chunk[] = [];
  let cur: number[] = [];
  let curLines = 0;
  let ci = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const pl = estimateLines(paragraphs[i], opts);
    // не влізає в поточний чанк і вже щось є → закриваємо чанк і починаємо новий
    if (cur.length > 0 && curLines + pl > maxLines) {
      chunks.push({
        index: ci++,
        start: cur[0],
        end: cur[cur.length - 1],
        paragraphIndices: cur,
        estLines: curLines,
      });
      cur = [];
      curLines = 0;
    }
    cur.push(i);
    curLines += pl;
    // безпечний кап: дуже довгий абзац сам формує окремий чанк
    if (cur.length > 0 && curLines >= maxLines) {
      chunks.push({
        index: ci++,
        start: cur[0],
        end: cur[cur.length - 1],
        paragraphIndices: cur,
        estLines: curLines,
      });
      cur = [];
      curLines = 0;
    }
  }
  if (cur.length) {
    chunks.push({
      index: ci++,
      start: cur[0],
      end: cur[cur.length - 1],
      paragraphIndices: cur,
      estLines: curLines,
    });
  }
  return chunks;
}

/** Індекси наступних `ahead` чанків відносно поточного видимого абзацу. */
export function nextChunkIndices(chunks: Chunk[], currentParagraphIndex: number, ahead: number): number[] {
  if (chunks.length === 0) return [];
  let curChunk = -1;
  for (let i = 0; i < chunks.length; i++) {
    if (currentParagraphIndex >= chunks[i].start && currentParagraphIndex <= chunks[i].end) {
      curChunk = i;
      break;
    }
    if (currentParagraphIndex < chunks[i].start) {
      curChunk = i - 1;
      break;
    }
  }
  if (curChunk < 0) curChunk = 0;
  if (curChunk >= chunks.length) curChunk = chunks.length - 1;
  const out: number[] = [];
  for (let i = curChunk + 1; i < Math.min(chunks.length, curChunk + 1 + ahead); i++) out.push(i);
  return out;
}

/** Індекс чанка, що містить даний абзац (для поточної позиції). */
export function chunkIndexForParagraph(chunks: Chunk[], paragraphIndex: number): number {
  for (let i = 0; i < chunks.length; i++) {
    if (paragraphIndex >= chunks[i].start && paragraphIndex <= chunks[i].end) return i;
  }
  if (paragraphIndex < 0) return 0;
  return chunks.length - 1;
}
