// services/parserClient.ts
// Клієнт для виклику парсерів з main thread. На web — через Worker (без блокування UI),
// на native — через main (Worker недоступний, але з yield через await → UI не фрізить).
//
// Підтримувані формати: epub, fb2, mobi, docx, odt, rtf, html, zip
// TXT залишається inline (миттєвий, не блокує).

import type { ParseResult } from '../workers/parserWorker';

export type ParserFormat = 'epub' | 'fb2' | 'mobi' | 'docx' | 'odt' | 'rtf' | 'html' | 'zip';

export interface ParserTaskOptions {
  format: ParserFormat;
  uri: string;
  bytes?: ArrayBuffer;        // опціонально: байти (для web Worker)
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export interface QueuedTask {
  id: string;
  resolve: (r: ParseResult) => void;
  reject: (e: Error) => void;
  options: ParserTaskOptions;
}

class ParserClient {
  private worker: Worker | null = null;
  private queue: QueuedTask[] = [];
  private current: QueuedTask | null = null;
  private nextId = 0;
  private isWeb = typeof window !== 'undefined' && typeof Worker !== 'undefined';

  private getWorker(): Worker | null {
    if (!this.isWeb) return null;
    if (this.worker) return this.worker;
    try {
      // new Worker(new URL(...)) — стандартний веб-патерн (vite/webpack підтримують).
      this.worker = new Worker(new URL('../workers/parserWorker.web.ts', import.meta.url));
      return this.worker;
    } catch (e) {
      console.warn('[parserClient] Worker init failed, fallback to main:', e);
      return null;
    }
  }

  enqueue(options: ParserTaskOptions): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
      const task: QueuedTask = {
        id: `task_${++this.nextId}`,
        resolve,
        reject,
        options,
      };

      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          const idx = this.queue.indexOf(task);
          if (idx >= 0) this.queue.splice(idx, 1);
          reject(new Error('Aborted'));
        });
      }

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
    const { format, uri, bytes, onProgress } = task.options;
    const worker = this.getWorker();

    if (worker && bytes) {
      try {
        const result = await this.runOnWorker(worker, format, uri, bytes, onProgress);
        task.resolve(result);
        return;
      } catch (e: any) {
        console.warn('[parserClient] Worker failed, falling back to main:', e);
      }
    }

    try {
      const result = await this.runOnMain(format, uri, bytes, onProgress);
      task.resolve(result);
    } catch (e: any) {
      task.reject(e instanceof Error ? e : new Error(String(e)));
    }
  }

  private runOnWorker(
    worker: Worker,
    format: ParserFormat,
    uri: string,
    bytes: ArrayBuffer,
    onProgress?: (p: number) => void,
  ): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
      const onMessage = (e: MessageEvent) => {
        const data = e.data;
        if (data.type === 'progress') onProgress?.(data.percent);
        else if (data.type === 'done') {
          worker.removeEventListener('message', onMessage);
          worker.removeEventListener('error', onError);
          resolve(data.result);
        } else if (data.type === 'error') {
          worker.removeEventListener('message', onMessage);
          worker.removeEventListener('error', onError);
          reject(new Error(data.message));
        }
      };
      const onError = (e: ErrorEvent) => {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        reject(new Error(e.message));
      };
      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      // Transferable — zero-copy передача байтів
      worker.postMessage({ type: 'parse', format, uri, bytes }, [bytes]);
    });
  }

  private async runOnMain(
    format: ParserFormat,
    uri: string,
    bytes: ArrayBuffer | undefined,
    onProgress?: (p: number) => void,
  ): Promise<ParseResult> {
    let arrayBuffer: ArrayBuffer | undefined = bytes;
    if (!arrayBuffer) {
      // @ts-ignore
      const FileSystem: any = require('expo-file-system/legacy');
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
    }

    // Делегуємо парсеру
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
