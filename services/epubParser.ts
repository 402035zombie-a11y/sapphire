// services/epubParser.ts
// EPUB = ZIP-архив. Читаем через jszip, находим OPF по container.xml,
// берём spine в порядке чтения, извлекаем чистый текст из XHTML.
import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system';

export interface EpubParseResult {
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

function stripHtml(html: string): string {
  // вырезаем скрипты/стили целиком
  let t = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  t = t.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  // блочные теги → перенос строки, остальные теги → пробел
  t = t.replace(/<\s*(p|div|br|h[1-6]|li|\/p|\/div|\/h[1-6]|\/li)\s*\/?\s*>/gi, '\n');
  t = t.replace(/<[^>]+>/g, ' ');
  t = decodeEntities(t);
  t = t.replace(/[ \t]+/g, ' ');
  t = t.replace(/\n{2,}/g, '\n');
  return t.trim();
}

function resolvePath(baseDir: string, href: string): string {
  // baseDir — директория OPF, href — относительный путь внутри zip
  const parts = (baseDir ? baseDir.split('/') : []);
  for (const seg of href.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

function firstMatch(xml: string, re: RegExp): string | undefined {
  const m = xml.match(re);
  return m && m[1] ? decodeEntities(m[1].trim()) : undefined;
}

export async function parseEpub(
  uri: string,
  onProgress?: (p: number) => void,
): Promise<EpubParseResult> {
  onProgress?.(0.05);
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  onProgress?.(0.25);
  const zip = await JSZip.loadAsync(base64, { base64: true });

  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) throw new Error('Некорректный EPUB: нет META-INF/container.xml');
  const containerXml = await containerFile.async('text');
  const opfRelPath = firstMatch(containerXml, /full-path="([^"]+)"/i);
  if (!opfRelPath) throw new Error('Не найден путь к OPF в container.xml');

  const opfFile = zip.file(opfRelPath);
  if (!opfFile) throw new Error(`OPF не найден в архиве: ${opfRelPath}`);
  const opfXml = await opfFile.async('text');
  const opfDir = opfRelPath.includes('/') ? opfRelPath.slice(0, opfRelPath.lastIndexOf('/')) : '';

  // манифест: id -> href
  const manifest: Record<string, string> = {};
  const itemRe = /<item\b[^>]*\bid="([^"]+)"[^>]*\bhref="([^"]+)"[^>]*\bmedia-type="application\/xhtml\+xml"[^>]*\/?>/gi;
  let im: RegExpExecArray | null;
  while ((im = itemRe.exec(opfXml))) manifest[im[1]] = im[2];

  // spine: упорядоченный список idref
  const spineBlock = opfXml.match(/<spine\b[\s\S]*?<\/spine>/i);
  const orderedHrefs: string[] = [];
  if (spineBlock) {
    const refRe = /<itemref\b[^>]*\bidref="([^"]+)"/gi;
    let rm: RegExpExecArray | null;
    while ((rm = refRe.exec(spineBlock[0]))) {
      const href = manifest[rm[1]];
      if (href) orderedHrefs.push(resolvePath(opfDir, href));
    }
  }
  // fallback: если spine пуст, берём все xhtml из манифеста
  if (orderedHrefs.length === 0) {
    Object.values(manifest).forEach((h) => orderedHrefs.push(resolvePath(opfDir, h)));
  }

  const paragraphs: string[] = [];
  for (let i = 0; i < orderedHrefs.length; i++) {
    const href = orderedHrefs[i];
    const file = zip.file(href);
    if (!file) continue;
    const raw = await file.async('text');
    const text = stripHtml(raw);
    if (text) paragraphs.push(text);
    // прогресс от 0.3 до 0.9 по мере чтения spine
    onProgress?.(0.3 + (0.6 * (i + 1)) / orderedHrefs.length);
  }

  const title = firstMatch(opfXml, /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
  const author = firstMatch(opfXml, /<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);

  onProgress?.(1);
  return { text: paragraphs.join('\n\n'), title, author };
}
