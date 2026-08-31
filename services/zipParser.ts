// services/zipParser.ts
// ZIP-архів з книгою всередині (.zip). Часто старі бібліотеки пакують .txt/.fb2/.epub
// у звичайний zip. Розпаковуємо через jszip, знаходимо ПЕРШИЙ файл книги
// (txt/fb2/epub/html/mobi/docx/odt/rtf) і делегуємо відповідному парсеру.
import JSZip from 'jszip';
import { stripHtmlToText } from '../utils/htmlEntities';
import { parseTxt } from './txtParser';
import { parseFb2 } from './fb2Parser';
import { parseEpub } from './epubParser';
import { parseHtml } from './htmlParser';
import { parseMobi } from './mobiParser';
import { parseDocx } from './docxParser';
import { parseOdt } from './odtParser';
import { parseRtf } from './rtfParser';

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
const BOOK_EXTS = new Set(['txt', 'fb2', 'html', 'htm', 'mobi', 'azw', 'azw3', 'prc', 'docx', 'odt', 'rtf']);

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

  const zip = await JSZip.loadAsync(base64, { base64: true });

  // Збираємо всі файли (не директорії), сортуємо: спершу менші за 2MB (ймовірні книги)
  const files = Object.values(zip.files).filter((f) => !f.dir);
  if (files.length === 0) throw new Error('ZIP is empty');

  // Знайти кандидата-книгу: файл з розширенням книги, без "mimetype"/"container.xml"/описових
  const candidates = files
    .map((f) => f.name)
    .filter((n) => {
      const e = extOf(n);
      if (!BOOK_EXTS.has(e)) return false;
      const base = n.split('/').pop() || '';
      // відсіюємо службові файли
      if (/mimetype|container\.xml|\.opf$|\.ncx$|\.css$|\.js$|\.json$/.test(base)) return false;
      return true;
    })
    .sort((a, b) => {
      // глибина шляху: кореневий файл перший
      const depthA = a.split('/').length;
      const depthB = b.split('/').length;
      if (depthA !== depthB) return depthA - depthB;
      return a.localeCompare(b);
    });

  if (candidates.length === 0) {
    throw new Error('No readable book found inside ZIP (supported: txt, fb2, epub, html, mobi, docx, odt, rtf)');
  }

  // Беремо перший кандидат, читаємо як base64, далі парсимо за розширенням
  const name = candidates[0];
  const ext = extOf(name);
  const file = zip.file(name);
  if (!file) throw new Error('ZIP entry missing: ' + name);
  const innerB64 = await file.async('base64');

  // txt/html читаються з тексту напряму; інші — потребують файл/шлях, тому
  // зберігаємо в cache і викликаємо парсер по file:// uri.
  if (ext === 'txt' || ext === 'htm' || ext === 'html') {
    const text = await file.async('text');
    return {
      text: ext === 'txt' ? text : await stripHtmlText(text),
      title: (name.split('/').pop() || '').replace(/\.[^.]+$/, ''),
      innerFormat: ext,
    };
  }

  // Для fb2/mobi/docx/odt/rtf/epub — записуємо розпакований файл у cache і парсимо по uri
  const innerUri = `${FileSystem.cacheDirectory}br_zip_inner_${Date.now()}.${ext}`;
  await FileSystem.writeAsStringAsync(innerUri, innerB64, { encoding: 'base64' as any });

  switch (ext) {
    case 'fb2': {
      const r = await parseFb2(innerUri);
      return { text: (r as any).text ?? '', title: (r as any).title, innerFormat: ext };
    }
    case 'mobi':
    case 'azw':
    case 'azw3':
    case 'prc': {
      const r = await parseMobi(innerUri);
      return { text: r.text, title: r.title, innerFormat: ext };
    }
    case 'docx': {
      const r = await parseDocx(innerUri);
      return { text: (r as any).text ?? '', title: (r as any).title, innerFormat: ext };
    }
    case 'odt': {
      const r = await parseOdt(innerUri);
      return { text: (r as any).text ?? '', title: (r as any).title, innerFormat: ext };
    }
    case 'rtf': {
      const r = await parseRtf(innerUri);
      return { text: (r as any).text ?? '', title: (r as any).title, innerFormat: ext };
    }
    case 'epub': {
      // epub у zip — розпаковуємо на disk і читаємо parseEpub
      const r = await parseEpub(innerUri);
      return { text: (r as any).text ?? '', title: (r as any).title, author: (r as any).author, cover: (r as any).cover, innerFormat: ext };
    }
    default:
      throw new Error('Unsupported inner format: ' + ext);
  }
}

async function stripHtmlText(html: string): Promise<string> {
  return stripHtmlToText(html);
}
