// services/odtParser.ts
// ODT = ZIP-архив. Читаем content.xml (Flat ODF) або
// OEBPS/content.xml, извлекаем текст из <text:p> параграфов.
import JSZip from 'jszip';
import { tStatic } from '../i18n';
import { decodeHtmlEntities } from '../utils/htmlEntities';

export interface OdtParseResult {
  text: string;
  title?: string;
  author?: string;
}

function decodeEntities(s: string): string {
  return decodeHtmlEntities(s);
}

function firstMatch(xml: string, re: RegExp): string | undefined {
  const m = xml.match(re);
  return m && m[1] ? decodeEntities(m[1].trim()) : undefined;
}

// @ts-ignore
const FileSystem: any = require('expo-file-system/legacy');

async function readBase64(uri: string): Promise<string> {
  if (/^https?:\/\//i.test(uri)) {
    const buf = await (await fetch(uri)).arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }
  const cacheUri = `${FileSystem.cacheDirectory}br_odt_${Date.now()}.odt`;
  await FileSystem.copyAsync({ from: uri, to: cacheUri });
  return FileSystem.readAsStringAsync(cacheUri, { encoding: 'base64' as any });
}

export async function parseOdt(
  uri: string,
  onProgress?: (p: number) => void,
): Promise<OdtParseResult> {
  const tick = (p: number) => onProgress?.(p);
  tick(0.05);
  const base64 = await readBase64(uri);
  // base64 → ArrayBuffer
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return parseOdtFromBytes(bytes.buffer, onProgress);
}

/**
 * Парсер ODT з готових байтів — для Web Worker.
 */
export async function parseOdtFromBytes(
  arrayBuffer: ArrayBuffer,
  onProgress?: (p: number) => void,
): Promise<OdtParseResult> {
  const tick = (p: number) => onProgress?.(p);
  tick(0.05);
  const zip = await JSZip.loadAsync(arrayBuffer);

  const contentFile =
    zip.file('content.xml') ||
    zip.file('OEBPS/content.xml') ||
    Object.values(zip.files).find((f: any) => /content\.xml$/i.test(f.name));
  if (!contentFile) throw new Error(tStatic('Invalid ODT: missing content.xml'));
  const xml = await contentFile.async('text');
  tick(0.25);

  const paraBlocks = xml.split(/<text:p[ >]/i).slice(1);
  const paragraphs: string[] = [];
  for (const block of paraBlocks) {
    let t = block.replace(/<[^>]+>/g, ' ');
    t = decodeEntities(t).replace(/\s+/g, ' ').trim();
    if (t) paragraphs.push(t);
  }
  tick(0.85);

  const meta = zip.file('meta.xml');
  let title, author;
  if (meta) {
    const mx = await meta.async('text');
    title = firstMatch(mx, /<dc:title>([\s\S]*?)<\/dc:title>/i);
    author = firstMatch(mx, /<dc:creator>([\s\S]*?)<\/dc:creator>/i);
  }
  tick(1);
  return { text: paragraphs.join('\n\n'), title, author };
}
