// services/txtParser.ts
// Простое чтение .txt с нормализацией переносов строк.
// file:// (document picker на нативі) не читається через fetch() — читаємо через
// expo-file-system/legacy (як docxParser/epubParser). Для http(s) — fetch.
export interface TxtParseResult {
  text: string;
  title?: string;
}

export async function parseTxt(
  uri: string,
  fallbackTitle?: string,
  onProgress?: (p: number) => void,
): Promise<TxtParseResult> {
  onProgress?.(0.3);
  let raw: string;
  if (/^https?:\/\//i.test(uri)) {
    const res = await fetch(uri);
    raw = await res.text();
  } else {
    // @ts-ignore
    const FS: any = require('expo-file-system/legacy');
    const cacheUri = `${FS.cacheDirectory}br_txt_${Date.now()}.txt`;
    await FS.copyAsync({ from: uri, to: cacheUri });
    raw = await FS.readAsStringAsync(cacheUri, { encoding: 'utf8' as any });
  }
  onProgress?.(0.7);
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const title =
    fallbackTitle ||
    uri
      .split('/')
      .pop()
      ?.replace(/\.txt$/i, '');
  onProgress?.(1);
  return { text, title };
}
