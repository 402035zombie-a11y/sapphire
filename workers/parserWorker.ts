// workers/parserWorker.ts
// Заглушка для native — Worker не використовується, парсинг йде в main через
// parserClient → runOnMain. Файл існує, щоб уникнути import error на native платформі.
// Реальна web-версія: parserWorker.web.ts (використовується через new Worker(new URL(...)))

export interface ParseResult {
  text: string;
  title?: string;
  author?: string;
  cover?: string;
  innerFormat?: string;
}

export {};
