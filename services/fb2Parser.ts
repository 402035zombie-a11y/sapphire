// services/fb2Parser.ts
// FB2 (FictionBook 2.0) — XML. Извлекаем текст из <body> (пропуская notes),
// разбиваем на параграфы по <p>/<empty-line>/<title>.
import * as FileSystem from 'expo-file-system';

export interface Fb2ParseResult {
  text: string;
  title?: string;
  author?: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

export function parseFb2Text(xml: string): Fb2ParseResult {
  // заголовок книги: <book-title>...</book-title>
  const title = matchTag(xml, 'book-title');
  // автор: <first-name> + <last-name> внутри <author>
  const authorBlock = matchTag(xml, 'author');
  let author: string | undefined;
  if (authorBlock) {
    const first = matchTag(authorBlock, 'first-name');
    const last = matchTag(authorBlock, 'last-name');
    author = [first, last].filter(Boolean).join(' ') || undefined;
  }

  // тело книги: первый <body> (без name — основной), пропускаем notes-блоки
  const bodies = [...xml.matchAll(/<body\b([^>]*)>([\s\S]*?)<\/body>/gi)];
  const mainBody = bodies.find((b) => !/\bname\s*=/.test(b[1])) ?? bodies[0];
  const bodyXml = mainBody ? mainBody[2] : xml;

  // удаляем примечания и прочие вложенные <body name="notes">
  let text = bodyXml.replace(/<body\b[^>]*name=[^>]*>[\s\S]*?<\/body>/gi, ' ');

  // блочные элементы → перенос строки
  text = text.replace(/<\s*(?:title|p|empty-line|li|subtitle|epigraph)\b[^>]*\/?\s*>/gi, '\n');
  text = text.replace(/<\s*\/\s*(?:title|p|li|subtitle|epigraph|section)\s*>/gi, '\n');
  // все остальные теги → пробел
  text = text.replace(/<[^>]+>/g, ' ');
  text = decodeEntities(text);
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{2,}/g, '\n');
  text = text.trim();

  return { text, title, author };
}

export async function parseFb2(
  uri: string,
  onProgress?: (p: number) => void,
): Promise<Fb2ParseResult> {
  onProgress?.(0.1);
  // file:// (document picker) не читається через fetch() на нативі — читаємо байти
  // через expo-file-system/legacy (як docxParser/epubParser).
  let raw: string;
  if (/^https?:\/\//i.test(uri)) {
    raw = await (await fetch(uri)).text();
  } else {
    // @ts-ignore
    const FS: any = require('expo-file-system/legacy');
    const cacheUri = `${FS.cacheDirectory}br_fb2_${Date.now()}.fb2`;
    await FS.copyAsync({ from: uri, to: cacheUri });
    raw = await FS.readAsStringAsync(cacheUri, { encoding: 'utf8' as any });
  }
  onProgress?.(0.4);
  const res = parseFb2Text(raw);
  onProgress?.(1);
  return res;
}

function matchTag(xml: string, tag: string): string | undefined {
  const m = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!m) return undefined;
  return decodeEntities(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}
