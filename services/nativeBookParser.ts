/**
 * nativeBookParser — тонкий JS-бридж до Kotlin TurboModule (JSI).
 *
 * Контракт: повертає РІВНО ту саму структуру, що й JS-парсери (ParsedBook),
 * тому фасад services/bookParser.ts підміняє реалізацію без зміни викликачів.
 *
 * Якщо модуль відсутній (web / iOS / Expo Go / стара збірка) — isNativeParserAvailable()
 * повертає false, і фасад іде у JS-фолбек.
 */
import { Platform } from 'react-native';
import type { ParsedBook, ParsedChapter } from './bookParser';

type NativeSpec = {
  parseEpub(path: string): Promise<string>;
  parseFb2(path: string): Promise<string>;
  isAvailable(): boolean;
};

let cached: NativeSpec | null | undefined;

function getModule(): NativeSpec | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (Platform.OS !== 'android') return cached;
  try {
    // Ліниве require: на web/iOS TurboModuleRegistry-спека не має нативної реалізації.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../specs/NativeBookParser').default as NativeSpec | null;
    if (mod && typeof mod.parseEpub === 'function') cached = mod;
  } catch {
    cached = null;
  }
  return cached;
}

export function isNativeParserAvailable(): boolean {
  const m = getModule();
  if (!m) return false;
  try {
    return m.isAvailable();
  } catch {
    return false;
  }
}

function normalize(raw: unknown, fmt: string): ParsedBook {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const list = (obj.chapters as unknown[]) ?? [];
  const chapters: ParsedChapter[] = list.map((c, i) => {
    const ch = (c ?? {}) as Record<string, unknown>;
    const content = (ch.contentHtml ?? ch.content ?? ch.html ?? ch.text ?? '') as string;
    return {
      idx: typeof ch.idx === 'number' ? (ch.idx as number) : i,
      title: (ch.title as string) || `Chapter ${i + 1}`,
      href: (ch.href as string) ?? String(i),
      contentHtml: content,
      charCount: typeof ch.charCount === 'number' ? (ch.charCount as number) : content.length,
    };
  });
  if (chapters.length === 0) {
    throw new Error('native parser returned no chapters');
  }
  return {
    title: (obj.title as string) || 'Unknown',
    author: (obj.author as string) || '',
    format: fmt,
    chapters,
  };
}

/** Нативний EPUB-парсинг. Кидає помилку → фасад робить JS-фолбек. */
export async function parseEpubNative(path: string): Promise<ParsedBook> {
  const m = getModule();
  if (!m) throw new Error('NativeBookParser unavailable');
  const json = await m.parseEpub(path);
  return normalize(JSON.parse(json), 'epub');
}

/** Нативний FB2-парсинг (власний XML-парсер на Kotlin). */
export async function parseFb2Native(path: string): Promise<ParsedBook> {
  const m = getModule();
  if (!m) throw new Error('NativeBookParser unavailable');
  const json = await m.parseFb2(path);
  return normalize(JSON.parse(json), 'fb2');
}
