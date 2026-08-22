// services/txtParser.ts
// Простое чтение .txt с нормализацией переносов строк.
// SDK54: readAsStringAsync deprecated+throws → используем fetch (expo fetch polyfill
// поддерживает file:// на native). Запасной путь — expo-file-system/legacy при необходимости.
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
  const res = await fetch(uri);
  const raw = await res.text();
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
