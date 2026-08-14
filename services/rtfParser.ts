// services/rtfParser.ts
// RTF — текстовий формат з управляючими командами {\rtf...}.
// Витягуємо текст: прибираємо {\*\controlword...}, залишаємо текст,
// переноси \par → \n.
import { tStatic } from '../i18n';

export interface RtfParseResult {
  text: string;
  title?: string;
  author?: string;
}

// @ts-ignore
const FileSystem: any = require('expo-file-system/legacy');

async function readText(uri: string): Promise<string> {
  if (/^https?:\/\//i.test(uri)) return (await (await fetch(uri)).text());
  const cacheUri = `${FileSystem.cacheDirectory}br_rtf_${Date.now()}.rtf`;
  await FileSystem.copyAsync({ from: uri, to: cacheUri });
  return FileSystem.readAsStringAsync(cacheUri, { encoding: 'utf8' as any });
}

export async function parseRtf(
  uri: string,
  onProgress?: (p: number) => void,
): Promise<RtfParseResult> {
  const tick = (p: number) => onProgress?.(p);
  tick(0.1);
  const raw = await readText(uri);
  tick(0.5);
  // прибираємо дестабионированные control words у групах {\*...}
  let t = raw.replace(/\{[^{}]*\\[*a-z]+[^}]*\}/gi, ' ');
  // прибираємо всі { } і команди \xxx
  t = t.replace(/[{}]/g, ' ');
  t = t.replace(/\\[a-z]+(-?\d+)?[ ]?/gi, ' ');
  // \par → перенос
  t = t.replace(/\\par[ ]?/gi, '\n');
  // чистимо hex-літерали \'xx
  t = t.replace(/\\'[0-9a-f]{2}/gi, '');
  t = t
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
  tick(1);
  return { text: t };
}
