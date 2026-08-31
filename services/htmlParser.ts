// services/htmlParser.ts
// HTML → чистий текст (strip тегів). Параграфи/блоки → \n.
import { tStatic } from '../i18n';
import { decodeHtmlEntities } from '../utils/htmlEntities';

export interface HtmlParseResult {
  text: string;
  title?: string;
  author?: string;
}

// @ts-ignore
const FileSystem: any = require('expo-file-system/legacy');

async function readText(uri: string): Promise<string> {
  if (/^https?:\/\//i.test(uri)) return (await (await fetch(uri)).text());
  const cacheUri = `${FileSystem.cacheDirectory}br_html_${Date.now()}.html`;
  await FileSystem.copyAsync({ from: uri, to: cacheUri });
  return FileSystem.readAsStringAsync(cacheUri, { encoding: 'utf8' as any });
}

function decodeEntities(s: string): string {
  return decodeHtmlEntities(s);
}

export async function parseHtml(
  uri: string,
  onProgress?: (p: number) => void,
): Promise<HtmlParseResult> {
  const tick = (p: number) => onProgress?.(p);
  tick(0.1);
  const html = await readText(uri);
  tick(0.5);
  let t = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  t = t.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  t = t.replace(/<(p|div|br|h[1-6]|li|\/p|\/div|\/h[1-6]|\/li)\b[^>]*\/?>/gi, '\n');
  t = t.replace(/<[^>]+>/g, ' ');
  t = decodeEntities(t).replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  tick(1);
  return { text: t, title: titleM ? decodeEntities(titleM[1].trim()) : undefined };
}
