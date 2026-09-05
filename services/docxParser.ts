// services/docxParser.ts
// DOCX = ZIP-архив (як EPUB). Читаем word/document.xml, извлекаем <w:t> текст
// по параграфам (<w:p>), и docProps/core.xml для title/author.
import JSZip from 'jszip';
import { tStatic } from '../i18n';
import { decodeHtmlEntities } from '../utils/htmlEntities';

export interface DocxParseResult {
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

// @ts-ignore — expo-file-system/legacy типи конфліктують з node_modules
const FileSystem: any = require('expo-file-system/legacy');

async function readBase64(uri: string): Promise<string> {
  if (/^https?:\/\//i.test(uri)) {
    const buf = await (await fetch(uri)).arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }
  const cacheUri = `${FileSystem.cacheDirectory}br_docx_${Date.now()}.docx`;
  await FileSystem.copyAsync({ from: uri, to: cacheUri });
  return FileSystem.readAsStringAsync(cacheUri, { encoding: 'base64' as any });
}

export async function parseDocx(
  uri: string,
  onProgress?: (p: number) => void,
): Promise<DocxParseResult> {
  const tick = (p: number) => onProgress?.(p);
  tick(0.05);
  const base64 = await readBase64(uri);
  // base64 → ArrayBuffer
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return parseDocxFromBytes(bytes.buffer, onProgress);
}

/**
 * Парсер DOCX з готових байтів — для Web Worker.
 */
export async function parseDocxFromBytes(
  arrayBuffer: ArrayBuffer,
  onProgress?: (p: number) => void,
): Promise<DocxParseResult> {
  const tick = (p: number) => onProgress?.(p);
  tick(0.05);
  const zip = await JSZip.loadAsync(arrayBuffer);

  const docFile = zip.file('word/document.xml') || zip.file('word/document2.xml');
  if (!docFile) throw new Error(tStatic('Invalid DOCX: missing word/document.xml'));
  const xml = await docFile.async('text');
  tick(0.25);

  // Розбиваемо на параграфи по <w:p> і збираем <w:t> у кожному
  const paraBlocks = xml.split(/<w:p[ >]/i).slice(1);
  const paragraphs: string[] = [];
  for (const block of paraBlocks) {
    const ts = block.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi) || [];
    let line = '';
    for (const t of ts) {
      const m = t.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/i);
      if (m) line += decodeEntities(m[1]);
    }
    if (line.trim()) paragraphs.push(line.trim());
  }
  tick(0.85);

  // core.xml → title/author
  const core = zip.file('docProps/core.xml');
  let title, author;
  if (core) {
    const cx = await core.async('text');
    title = firstMatch(cx, /<dc:title>([\s\S]*?)<\/dc:title>/i);
    author = firstMatch(cx, /<dc:creator>([\s\S]*?)<\/dc:creator>/i);
  }
  tick(1);
  return { text: paragraphs.join('\n\n'), title, author };
}
