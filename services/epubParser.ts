// services/epubParser.ts
// EPUB = ZIP-архив. Читаем через jszip, находим OPF по container.xml,
// берём spine в порядке чтения, извлекаем чистый текст из XHTML.
import JSZip from 'jszip';
import { tStatic } from '../i18n';
import { decodeHtmlEntities } from '../utils/htmlEntities';

export interface EpubParseResult {
  text: string;
  title?: string;
  author?: string;
  cover?: string;
}

function decodeEntities(s: string): string {
  return decodeHtmlEntities(s);
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
  // Throttle progress-коллбек: parseEpub вызывает onProgress на каждом xhtml-файле,
  // а UI re-render-ит модал прогресса → для книг с 50+ главами это setState-шторм
  // и лишний React-рендер (A4: hot-path bloat). Дебаунсим до частоты экрана.
  const emit = onProgress ? throttle(onProgress, 250) : undefined;
  let last = 0;
  const tick = (p: number) => { if (p - last >= 0.02 || p >= 1) { last = p; emit?.(p); } };
  tick(0.05);
  // Локальні файли (content:// / file:// від document picker на нативі) НЕ читаються
  // через fetch().arrayBuffer() (падає "error reading file"). Читаємо байти через
  // expo-file-system (підтримує content:// на нативі) як base64 → JSZip.
  // Для http(s) URL — fetch залишаємо.
  // expo-file-system/legacy імпортуємо динамічно (його типи конфліктують з tsc node_modules).
  // @ts-ignore
  const FileSystem: any = require('expo-file-system/legacy');
  let base64: string;
  if (/^https?:\/\//i.test(uri)) {
    const buf = await (await fetch(uri)).arrayBuffer();
    base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  } else {
    // content:// (від document picker на нативі) НЕ читається напряму readAsStringAsync.
    // Обхід: копіюємо у cache dir як file://, потім читаємо base64.
    const cacheUri = `${FileSystem.cacheDirectory}br_epub_${Date.now()}.epub`;
    await FileSystem.copyAsync({ from: uri, to: cacheUri });
    base64 = await FileSystem.readAsStringAsync(cacheUri, { encoding: 'base64' as any });
  }
  tick(0.25);
  const zip = await JSZip.loadAsync(base64, { base64: true });

  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) throw new Error(tStatic('Invalid EPUB: missing META-INF/container.xml'));
  const containerXml = await containerFile.async('text');
  const opfRelPath = firstMatch(containerXml, /full-path="([^"]+)"/i);
  if (!opfRelPath) throw new Error(tStatic('OPF path not found in container.xml'));


  const opfFile = zip.file(opfRelPath);
  if (!opfFile) throw new Error(tStatic('OPF not found in archive: {path}').replace('{path}', opfRelPath));
  const opfXml = await opfFile.async('text');
  const opfDir = opfRelPath.includes('/') ? opfRelPath.slice(0, opfRelPath.lastIndexOf('/')) : '';

  // манифест: id -> { href, mediaType } (стійкий парсинг — атрибути в будь-якому порядку)
  const manifest: Record<string, { href: string; mediaType: string }> = {};
  const itemRe = /<item\b[^>]*?>/gi;
  let im: RegExpExecArray | null;
  while ((im = itemRe.exec(opfXml))) {
    const tag = im[0];
    const idM = tag.match(/\bid="([^"]+)"/i);
    const hrefM = tag.match(/\bhref="([^"]+)"/i);
    const mtM = tag.match(/\bmedia-type="([^"]+)"/i);
    if (idM && hrefM && mtM) {
      manifest[idM[1]] = { href: hrefM[1], mediaType: mtM[1] };
    }
  }

  // обкладинка: item з Properties="cover-image" або id/назва містить "cover" і media-type image/*
  let coverHref: string | null = null;
  let coverType = 'image/jpeg';
  // K3: fallback — перша картинка маніфесту (Gutenberg-епаби часто без cover-image,
  // але мають ілюстрації; показуємо першу як обкладинку замість пустого слота).
  let firstImageHref: string | null = null;
  let firstImageType = 'image/jpeg';
  for (const [id, m] of Object.entries(manifest)) {
    if (!/image\//i.test(m.mediaType)) continue;
    if (!firstImageHref) { firstImageHref = m.href; firstImageType = m.mediaType; }
    coverType = m.mediaType;
    const props = opfXml.match(new RegExp(`<item\\b[^>]*\\bid="${id}"[^>]*\\bproperties="([^"]*)"`, 'i'));
    if (props && /cover-image/i.test(props[1])) { coverHref = m.href; break; }
    if (/cover/i.test(id)) { coverHref = m.href; break; }
  }
  if (!coverHref) { coverHref = firstImageHref; coverType = firstImageType; }
  let cover: string | undefined;
  if (coverHref) {
    const cands = [
      resolvePath(opfDir, coverHref),
      coverHref.replace(/^OEBPS\//i, ''),
      `OEBPS/${coverHref.replace(/^OEBPS\//i, '')}`,
    ];
    for (const c of cands) {
      const f = zip.file(c);
      if (f) {
        const b64 = await f.async('base64');
        cover = `data:${coverType};base64,${b64}`;
        break;
      }
    }
  }

  // spine: упорядоченный список idref
  const spineBlock = opfXml.match(/<spine\b[\s\S]*?<\/spine>/i);
  const orderedHrefs: string[] = [];
  if (spineBlock) {
    const refRe = /<itemref\b[^>]*?\bidref="([^"]+)"/gi;
    let rm: RegExpExecArray | null;
    while ((rm = refRe.exec(spineBlock[0]))) {
      const href = manifest[rm[1]]?.href;
      if (href) orderedHrefs.push(resolvePath(opfDir, href));
    }
  }
  // fallback: якщо spine порожній — всі xhtml з маніфесту
  if (orderedHrefs.length === 0) {
    Object.values(manifest).forEach((m) => orderedHrefs.push(resolvePath(opfDir, m.href)));
  }

  const paragraphs: string[] = [];
  for (let i = 0; i < orderedHrefs.length; i++) {
    const href = orderedHrefs[i];
    // Кандидати шляхів: прямий, з opfDir, без дублюючого префікса, з OEBPS/
    const candidates = [
      href,
      opfDir ? `${opfDir}/${href}` : href,
      href.replace(/^OEBPS\//i, ''),
      href.replace(/^OEBPS\//i, '').replace(/^\//, ''),
      `OEBPS/${href.replace(/^OEBPS\//i, '')}`,
    ];
    let file: any = null;
    for (const c of candidates) {
      file = zip.file(c);
      if (file) break;
    }
    if (!file) continue;
    const raw = await file.async('text');
    const text = stripHtml(raw);
    if (text) paragraphs.push(text);
    // прогресс от 0.3 до 0.9 по мере чтения spine
    tick(0.3 + (0.6 * (i + 1)) / orderedHrefs.length);
    // PERF: віддаємо кадр JS-потоку кожні кілька глав — UI (прогрес, кнопки)
    // не фризить на великих книгах (50+ xhtml). Без цього JS-block триває секунди.
    if ((i & 3) === 3) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  // base64 + распакованный zip освобождаются после return (больше не referenced).
  // Для эпюров 50+МБ: полное решение — Web Worker + чтение epub по-чанкам (BA-работа).

  const title = firstMatch(opfXml, /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
  const author = firstMatch(opfXml, /<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);

  tick(1);
  return { text: paragraphs.join('\n\n'), title, author, cover };
}

// Минимальный лимитер для progress-коллбеков. Один вызов за `minMs` — хватает на
// UI-обновление прогресса без setState-шторма на каждый xhtml-файл большой книги.
function throttle(fn: (p: number) => void, minMs: number): (p: number) => void {
  let last = 0;
  let pending = false;
  return (p: number) => {
    if (p >= 1) { fn(p); return; }
    const now = Date.now();
    if (now - last >= minMs) { last = now; fn(p); }
    else if (!pending) { pending = true; setTimeout(() => { pending = false; fn(p); }, minMs); }
  };
}
