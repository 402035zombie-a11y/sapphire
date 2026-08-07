// services/txtParser.ts
// Простое чтение .txt с нормализацией переносов строк.
import * as FileSystem from 'expo-file-system';

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
  const raw = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
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
