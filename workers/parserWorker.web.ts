// workers/parserWorker.web.ts
// Web Worker для парсингу файлів у фоні.
// Імпортується через new Worker(new URL('./parserWorker.web.ts', import.meta.url)).
// Викликає парсери з services/* які вміють приймати ArrayBuffer (parse*FromBytes).

import { parseEpubFromBytes } from '../services/epubParser';
import { parseFb2FromBytes } from '../services/fb2Parser';
import { parseMobiFromBytes } from '../services/mobiParser';
import { parseDocxFromBytes } from '../services/docxParser';
import { parseOdtFromBytes } from '../services/odtParser';
import { parseRtfFromBytes } from '../services/rtfParser';
import { parseHtmlFromBytes } from '../services/htmlParser';
import { parseZipFromBytes } from '../services/zipParser';

export interface ParseResult {
  text: string;
  title?: string;
  author?: string;
  cover?: string;
  innerFormat?: string; // для zip
}

interface ParseRequest {
  type: 'parse';
  format: 'epub' | 'fb2' | 'mobi' | 'docx' | 'odt' | 'rtf' | 'html' | 'zip';
  uri: string;
  bytes?: ArrayBuffer;
}

self.addEventListener('message', async (e: MessageEvent<ParseRequest>) => {
  const { type, format, uri, bytes } = e.data;
  if (type !== 'parse') return;

  try {
    const onProgress = (p: number) => {
      (self as any).postMessage({ type: 'progress', percent: p });
    };

    let result: ParseResult;
    if (!bytes) {
      // Немає байтів — помилка (Worker не має доступу до File API)
      throw new Error('Worker requires ArrayBuffer');
    }

    switch (format) {
      case 'epub':
        result = await parseEpubFromBytes(bytes, onProgress);
        break;
      case 'fb2':
        result = await parseFb2FromBytes(bytes, onProgress);
        break;
      case 'mobi':
        result = await parseMobiFromBytes(bytes, onProgress);
        break;
      case 'docx':
        result = await parseDocxFromBytes(bytes, onProgress);
        break;
      case 'odt':
        result = await parseOdtFromBytes(bytes, onProgress);
        break;
      case 'rtf':
        result = await parseRtfFromBytes(bytes, onProgress);
        break;
      case 'html':
        result = await parseHtmlFromBytes(bytes, onProgress);
        break;
      case 'zip':
        result = await parseZipFromBytes(bytes, onProgress);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    (self as any).postMessage({ type: 'done', result });
  } catch (e: any) {
    (self as any).postMessage({ type: 'error', message: e?.message ?? String(e) });
  }
});
