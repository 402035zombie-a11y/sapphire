// services/wordImportQueue.ts
// Фоновий (неблокуючий) ланцюжок імпорту слів книги в словник.
//
// ЧОМУ ЦЕ ПОТРІБНО:
//  - Раніше LibraryScreen.importBookDict блокував кнопку (disabled) і показував
//    прогрес поки йде імпорт 3000+ слів. Неможливо було паралельно імпортувати
//    іншу книгу або відкрити модалку додавання книги.
//  - Тепер логіку винесено сюди: enqueue(bookId) викликається і МИТТЄВО повертає
//    керування. Сам імпорт (buildBookDictionary + importEntries) йде асинхронно у
//    фоні з обмеженою конкурентністю. Кожна книга має свій прогрес/статус у сторі,
//    тому UI не блокується і кілька імпортів ідуть паралельно.
//
// UI-потік не блокується, бо buildBookDictionary всередині робить await translate()
// + await sleep() між чанками — події віддаються в event loop, тому рендер/тапи
// працюють нормально навіть під час імпорту.
import { create } from '../store/createStore';
import { buildBookDictionary } from './bookDictionaryService';
import { useDictionaryStore } from '../store/dictionaryStore';

export type ImportStatus = 'queued' | 'running' | 'done' | 'error';

export interface ImportJobState {
  bookId: string;
  title: string;
  status: ImportStatus;
  progress: number; // 0..1
  error?: string;
}

export interface ImportJob {
  bookId: string;
  title: string;
  paragraphs: { original: string }[];
  lang: string;
  targetLang: string;
}

interface WordImportState {
  // ключ — bookId; прогрес/статус кожної книги окремо
  jobs: Record<string, ImportJobState>;
  enqueue: (job: ImportJob) => void;
}

// Обмежена конкурентність: скільки імпортів одночасно у фоні.
// 2 → книга A і книга B імпортуються паралельно, жоден не блокує інший/UI.
const MAX_CONCURRENT = 2;

const queue: ImportJob[] = [];
let active = 0;

function setJob(bookId: string, patch: Partial<ImportJobState>) {
  useWordImportStore.setState((s) => {
    const prev = s.jobs[bookId];
    return {
      jobs: {
        ...s.jobs,
        [bookId]: { ...(prev as ImportJobState), ...patch, bookId },
      },
    };
  });
}

function pump() {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const job = queue.shift()!;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    runJob(job);
  }
}

async function runJob(job: ImportJob) {
  active += 1;
  setJob(job.bookId, { status: 'running', progress: 0 });
  try {
    const list = await buildBookDictionary(job.paragraphs, job.lang, job.targetLang, {
      bookId: job.bookId,
      onProgress: (p: number) => setJob(job.bookId, { progress: p }),
    });
    // Заливаємо в словник (існуюча API, з дедупом по word|lang).
    useDictionaryStore.getState().importEntries(list);
    setJob(job.bookId, { status: 'done', progress: 1 });
  } catch (e: any) {
    setJob(job.bookId, { status: 'error', error: e?.message ?? String(e) });
  } finally {
    active -= 1;
    pump();
  }
}

export const useWordImportStore = create<WordImportState>((set, get) => ({
  jobs: {},
  enqueue: (job) => {
    const existing = get().jobs[job.bookId];
    // Не ставимо в чергу двічі, якщо вже йде або чекає.
    if (existing && (existing.status === 'queued' || existing.status === 'running')) return;
    setJob(job.bookId, {
      title: job.title,
      status: 'queued',
      progress: existing?.status === 'done' || existing?.status === 'error' ? 0 : (existing?.progress ?? 0),
    });
    queue.push(job);
    pump();
  },
}));

// Зручна обгортка для виклику поза React.
export function enqueueWordImport(job: ImportJob) {
  useWordImportStore.getState().enqueue(job);
}
