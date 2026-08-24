/**
 * bookParser — фасад парсингу книг.
 * Зараз делегує до існуючих JS-парсерів (services/*Parser.ts).
 * ПІЗНІШЕ: замінити на нативний TurboModule (Kotlin/Swift+JSI) БЕЗ зміни викликачів.
 *
 * parse-once → структура глав → збереження в books.db (E2/E3).
 */
import { parseEpub } from './epubParser';
import { parseFb2 } from './fb2Parser';
import { parseTxt } from './txtParser';
import { parseDocx } from './docxParser';
import { parseRtf } from './rtfParser';
import { parseOdt } from './odtParser';
import { parseHtml } from './htmlParser';

export interface ParsedChapter {
  idx: number;
  title: string;
  href: string;
  contentHtml: string;
  charCount: number;
}

export interface ParsedBook {
  title: string;
  author: string;
  format: string;
  chapters: ParsedChapter[];
}

type AnyParser = (p: string) => Promise<unknown>;

const byFormat: Record<string, AnyParser> = {
  epub: parseEpub as AnyParser,
  fb2: parseFb2 as AnyParser,
  txt: parseTxt as AnyParser,
  docx: parseDocx as AnyParser,
  rtf: parseRtf as AnyParser,
  odt: parseOdt as AnyParser,
  html: parseHtml as AnyParser,
  htm: parseHtml as AnyParser,
};

export function detectFormat(filePath: string): string {
  return filePath.split('.').pop()?.toLowerCase() ?? '';
}

/**
 * Нативний швидкий шлях (Android + New Arch TurboModule).
 * Ліниве require, щоб web/iOS-бандл не тягнув react-native-модуль без потреби.
 */
type NativeApi = {
  isNativeParserAvailable: () => boolean;
  parseEpubNative: (p: string) => Promise<ParsedBook>;
  parseFb2Native: (p: string) => Promise<ParsedBook>;
};

function nativeApi(): NativeApi | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const api = require('./nativeBookParser') as NativeApi;
    return api.isNativeParserAvailable() ? api : null;
  } catch {
    return null;
  }
}

async function tryNative(fmt: string, filePath: string): Promise<ParsedBook | null> {
  const api = nativeApi();
  if (!api) return null;
  try {
    if (fmt === 'epub') return await api.parseEpubNative(filePath);
    if (fmt === 'fb2') return await api.parseFb2Native(filePath);
    return null;
  } catch (e) {
    // Будь-яка нативна помилка → тихий фолбек на JS-парсер (той самий результат, повільніше).
    if (__DEV__) console.warn('[bookParser] native parse failed, JS fallback:', e);
    return null;
  }
}

export async function parseBook(filePath: string): Promise<ParsedBook> {
  const fmt = detectFormat(filePath);
  const native = await tryNative(fmt, filePath);
  if (native) return native;
  const parser = byFormat[fmt];
  if (!parser) {
    throw new Error(`Unsupported format: .${fmt} (allowed: EPUB/FB2/TXT/DOCX/ODT/RTF/HTML — PDF/MOBI excluded)`);
  }
  const raw = (await parser(filePath)) as Record<string, unknown>;
  // Tolerant mapping: parsers may return varying shapes.
  const chaptersRaw = (raw.chapters as unknown[]) ?? [];
  const chapters: ParsedChapter[] = chaptersRaw.map((c, i) => {
    const ch = c as Record<string, unknown>;
    const content = (ch.content ?? ch.html ?? ch.text ?? '') as string;
    return {
      idx: (ch.idx as number) ?? i,
      title: (ch.title as string) ?? `Chapter ${i + 1}`,
      href: (ch.href as string) ?? String(i),
      contentHtml: content,
      charCount: content.length,
    };
  });
  return {
    title: (raw.title as string) ?? 'Unknown',
    author: (raw.author as string) ?? '',
    format: fmt,
    chapters,
    // M1: parseTxt повертає text без chapters — прокидаємо далі, щоб importBook
    // міг побудувати главу. Раніше text губився тут → txt-книги мали 0 глав.
    ...(chapters.length === 0 && typeof raw.text === 'string' ? { text: raw.text } : {}),
  } as ParsedBook;
}
