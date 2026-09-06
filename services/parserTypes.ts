// services/parserTypes.ts
// Спільні типи для парсерів (використовуються в parserClient і LibraryScreen).

export interface ParseResult {
  text: string;
  title?: string;
  author?: string;
  cover?: string;
  innerFormat?: string;
}
