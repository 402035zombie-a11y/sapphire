// services/zipParser.ts
// ZIP-архів з книгою всередині (.zip). Часто старі бібліотеки пакують .txt/.fb2/.epub
// у звичайний zip. Розпаковуємо через jszip, знаходимо ПЕРШИЙ файл книги
// (txt/fb2/epub/html/mobi/docx/odt/rtf) і делегуємо відповідному парсеру.
import JSZip from 'jszip';
import { parseHtmlFromBytes } from './htmlParser';
import { parseFb2FromBytes } from './fb2Parser';
import { parseEpubFromBytes } from './epubParser';
import { parseMobiFromBytes } from './mobiParser';
import { parseDocxFromBytes } from './docxParser';
import { parseOdtFromBytes } from './odtParser';
import { parseRtfFromBytes } from './rtfParser';

export interface ZipParseResult {
  text: string;
  title?: string;
  author?: string;
  cover?: string;
  /** Розширення знайденої книги всередині zip (для діагностики) */
  innerFormat?: string;
}

function extOf(name: string): string {
  return (name.split('.').pop() || '').toLowerCase();
}

// Кандидати в порядку пріоритету (найпоширеніші першими)
const BOOK_EXTS = new Set(['txt', 'fb2', 'html', 'htm', 'xhtml', 'epub', 'mobi', 'azw', 'azw3', 'prc', 'docx', 'odt', 'rtf']);

export async function parseZip(uri: string): Promise<ZipParseResult> {
  // Читаємо локальний файл (content:// file://) через expo-file-system, як epubParser.
  // @ts-ignore
  const FileSystem: any = require('expo-file-system/legacy');
  let base64: string;
  if (/^https?:\/\//i.test(uri)) {
    const buf = await (await fetch(uri)).arrayBuffer();
    base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  } else {
    const cacheUri = `${FileSystem.cacheDirectory}br_zip_${Date.now()}.zip`;
    await FileSystem.copyAsync({ from: uri, to: cacheUri });
    base64 = await FileSystem.readAsStringAsync(cacheUri, { encoding: 'base64' as any });
  }
  // base64 → ArrayBuffer
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return parseZipFromBytes(bytes.buffer);
}

/**
 * Парсер ZIP з готових байтів — для Web Worker.
 * Знаходить першу книгу всередині zip і парсить її відповідним парсером.
 */
export async function parseZipFromBytes(
  arrayBuffer: ArrayBuffer,
  _onProgress?: (p: number) => void,
): Promise<ZipParseResult> {
  const zip = await JSZip.loadAsync(arrayBuffer);

  const files = Object.values(zip.files).filter((f) => !f.dir);
  if (files.length === 0) throw new Error('ZIP is empty');

  const candidates = files
    .map((f) => f.name)
    .filter((n) => {
      const e = extOf(n);
      if (!BOOK_EXTS.has(e)) return false;
      const base = n.split('/').pop() || '';
      if (/mimetype|container\.xml|\.opf$|\.ncx$|\.css$|\.js$|\.json$/.test(base)) return false;
      return true;
    })
    .sort((a, b) => {
      const depthA = a.split('/').length;
      const depthB = b.split('/').length;
      if (depthA !== depthB) return depthA - depthB;
      return a.localeCompare(b);
    });

  if (candidates.length === 0) {
    throw new Error('No readable book found inside ZIP (supported: txt, fb2, epub, html, mobi, docx, odt, rtf)');
  }

  const name = candidates[0];
  const ext = extOf(name);
  const file = zip.file(name);
  if (!file) throw new Error('ZIP entry missing: ' + name);
  const innerBytes = await file.async('uint8array');
  // Створюємо КОПІЮ як ArrayBuffer (slice повертає ArrayBufferLike, потрібен ArrayBuffer).
  const innerBuffer = new Uint8Array(innerBytes).slice().buffer;

  switch (ext) {
    case 'txt': {
      const text = new TextDecoder('utf-8').decode(innerBytes);
      return { text, title: (name.split('/').pop() || '').replace(/\.[^.]+$/, ''), innerFormat: ext };
    }
    case 'htm':
    case 'html':
    case 'xhtml': {
      const r = await parseHtmlFromBytes(innerBuffer);
      return { text: r.text, title: r.title ?? (name.split('/').pop() || '').replace(/\.[^.]+$/, ''), innerFormat: ext };
    }
    case 'fb2': {
      const r = await parseFb2FromBytes(innerBuffer);
      return { text: r.text, title: r.title, innerFormat: ext };
    }
    case 'mobi':
    case 'azw':
    case 'azw3':
    case 'prc': {
      const r = await parseMobiFromBytes(innerBuffer);
      return { text: r.text, title: r.title, innerFormat: ext };
    }
    case 'docx': {
      const r = await parseDocxFromBytes(innerBuffer);
      return { text: r.text, title: r.title, innerFormat: ext };
    }
    case 'odt': {
      const r = await parseOdtFromBytes(innerBuffer);
      return { text: r.text, title: r.title, innerFormat: ext };
    }
    case 'rtf': {
      const r = await parseRtfFromBytes(innerBuffer);
      return { text: r.text, title: r.title, innerFormat: ext };
    }
    case 'epub': {
      const r = await parseEpubFromBytes(innerBuffer);
      return { text: r.text, title: r.title, author: r.author, cover: r.cover, innerFormat: ext };
    }
    default:
      throw new Error('Unsupported inner format: ' + ext);
  }
}
