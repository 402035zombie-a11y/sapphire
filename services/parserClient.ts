// services/parserClient.ts
// Клієнт для виклику парсерів. На всіх платформах — main thread з yield через await.
// Web Worker був би додатковою оптимізацією, але Hermes не підтримує import.meta,
// RN Worker вимагає окремого native модуля, а inline-Worker не має доступу до парсерів.
//
// Підтримувані формати: epub, fb2, mobi, docx, odt, rtf, html, zip
// TXT залишається inline (миттєвий).
//
// Що дає main-thread з yield:
//  - кожен парсер має setTimeout(0) кожні кілька глав/records → UI не фрізить
//  - placeholder-картка в Library показує прогрес
//  - юзер може гортати бібліотеку, відкривати налаштування, читати іншу книгу
//  - помилка → картка лишається в error-стані

import type { ParseResult } from './parserTypes';

export type ParserFormat = 'epub' | 'fb2' | 'mobi' | 'docx' | 'odt' | 'rtf' | 'html' | 'zip';

export interface ParserTaskOptions {
  format: ParserFormat;
  uri: string;
  onProgress?: (percent: number) => void;
}

export interface QueuedTask {
  id: string;
  resolve: (r: ParseResult) => void;
  reject: (e: Error) => void;
  options: ParserTaskOptions;
}

class ParserClient {
  private queue: QueuedTask[] = [];
  private current: QueuedTask | null = null;
  private nextId = 0;

  enqueue(options: ParserTaskOptions): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
      const task: QueuedTask = {
        id: `task_${++this.nextId}`,
        resolve,
        reject,
        options,
      };
      this.queue.push(task);
      this.tick();
    });
  }

  private tick() {
    if (this.current) return;
    const task = this.queue.shift();
    if (!task) return;
    this.current = task;
    this.runTask(task).finally(() => {
      this.current = null;
      if (this.queue.length) this.tick();
    });
  }

  private async runTask(task: QueuedTask): Promise<void> {
    const { format, uri, onProgress } = task.options;
    try {
      // yield перед важкою роботою — дає UI відмалювати placeholder-картку
      await new Promise((r) => setTimeout(r, 0));
      const result = await this.runOnMain(format, uri, onProgress);
      task.resolve(result);
    } catch (e: any) {
      task.reject(e instanceof Error ? e : new Error(String(e)));
    }
  }

  private async runOnMain(
    format: ParserFormat,
    uri: string,
    onProgress?: (p: number) => void,
  ): Promise<ParseResult> {
    // @ts-ignore — legacy модуль на native має типи що конфліктують з tsc
    const FileSystem: any = require('expo-file-system/legacy');

    // 1. Прочитати байти (всі парсери тепер мають parse*FromBytes)
    let arrayBuffer: ArrayBuffer;
    if (/^https?:\/\//i.test(uri)) {
      const buf = await (await fetch(uri)).arrayBuffer();
      arrayBuffer = buf;
    } else {
      const cacheUri = `${FileSystem.cacheDirectory}br_input_${Date.now()}.bin`;
      await FileSystem.copyAsync({ from: uri, to: cacheUri });
      const base64 = await FileSystem.readAsStringAsync(cacheUri, { encoding: 'base64' as any });
      const binary = atob(base64);
      const u8 = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) u8[i] = binary.charCodeAt(i);
      arrayBuffer = u8.buffer;
      try { await FileSystem.deleteAsync(cacheUri, { idempotent: true }); } catch {}
    }

    // 2. yield — UI може відреагувати
    await new Promise((r) => setTimeout(r, 0));

    // 3. Делегуємо парсеру
    switch (format) {
      case 'epub': {
        const { parseEpubFromBytes } = await import('./epubParser');
        return parseEpubFromBytes(arrayBuffer, onProgress);
      }
      case 'fb2': {
        const { parseFb2FromBytes } = await import('./fb2Parser');
        return parseFb2FromBytes(arrayBuffer, onProgress);
      }
      case 'mobi': {
        const { parseMobiFromBytes } = await import('./mobiParser');
        return parseMobiFromBytes(arrayBuffer, onProgress);
      }
      case 'docx': {
        const { parseDocxFromBytes } = await import('./docxParser');
        return parseDocxFromBytes(arrayBuffer, onProgress);
      }
      case 'odt': {
        const { parseOdtFromBytes } = await import('./odtParser');
        return parseOdtFromBytes(arrayBuffer, onProgress);
      }
      case 'rtf': {
        const { parseRtfFromBytes } = await import('./rtfParser');
        return parseRtfFromBytes(arrayBuffer, onProgress);
      }
      case 'html': {
        const { parseHtmlFromBytes } = await import('./htmlParser');
        return parseHtmlFromBytes(arrayBuffer, onProgress);
      }
      case 'zip': {
        const { parseZipFromBytes } = await import('./zipParser');
        return parseZipFromBytes(arrayBuffer, onProgress);
      }
    }
  }
}

export const parserClient = new ParserClient();
