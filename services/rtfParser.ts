// services/rtfParser.ts
// RTF — текстовий формат з управляючими командами {\rtf...}.
// СТЕКОВИЙ парсер: відстежує групи {...}, повністю ВИДАЛЯЄ службові групи
// (fonttbl, colortbl, info, stylesheet, generator, \*\*), лишає лише текст тіла.
// Обробляє: \par → \n, \'hh (hex) і \uN? (unicode) → символи.
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

// Службові групи, які треба цілком викинути (не лише їхні control words).
const SKIP_GROUPS = /fonttbl|colortbl|info|stylesheet|generator|themedata|colorschememapping|datastore|listtable|listoverridetable|revtbl|rsidtbl|latentstyles|pgptbl|header|footer|headerl|headerr|footerl|footerr|formfield|pict|object|fldrslt|xmlnstbl|userprops/;

export async function parseRtf(
  uri: string,
  onProgress?: (p: number) => void,
): Promise<RtfParseResult> {
  const tick = (p: number) => onProgress?.(p);
  tick(0.1);
  const raw = await readText(uri);
  tick(0.4);

  // Стекове проходження: викидаємо службові групи цілком, лишаємо текст тіла.
  let out = '';
  let i = 0;
  const n = raw.length;

  while (i < n) {
    const ch = raw[i];
    if (ch === '{') {
      i++;
      // після '{' зазвичай йде '\controlword' — пропускаємо backslash
      let word = '';
      if (raw[i] === '\\') i++; // пропускаємо leading backslash
      while (i < n && /[a-zA-Z]/.test(raw[i])) { word += raw[i]; i++; }
      // пропускаємо цифровий параметр (напр. \rtf1 → "1")
      while (i < n && /[0-9-]/.test(raw[i])) i++;
      if (raw[i] === ' ') i++;
      // якщо це службова група (\fonttbl, \*\generator, \colortbl, ...) → викидаємо всю групу
      if (word.startsWith('*') || SKIP_GROUPS.test(word)) {
        let depth = 1;
        while (i < n && depth > 0) {
          if (raw[i] === '{') depth++;
          else if (raw[i] === '}') depth--;
          i++;
        }
        out += ' ';
        continue;
      }
      // звичайна група — продовжуємо
      continue;
    } else if (ch === '}') {
      i++;
      continue;
    } else if (ch === '\\') {
      // control word / symbol
      i++;
      // \'hh — hex literal
      if (raw[i] === "'") {
        const hex = raw.substr(i + 1, 2);
        const code = parseInt(hex, 16);
        if (!isNaN(code)) {
          out += String.fromCharCode(code);
        }
        i += 3;
        continue;
      }
      // \uN — unicode (наступний символ — fallback для старих рідерів, пропускаємо)
      if (raw[i] === 'u') {
        i++;
        let num = '';
        while (i < n && /[0-9-]/.test(raw[i])) { num += raw[i]; i++; }
        const code = parseInt(num, 10);
        if (!isNaN(code) && code > 0) {
          out += String.fromCharCode(code);
        }
        // після \uN може бути пробіл-роздільник
        if (raw[i] === ' ') i++;
        continue;
      }
      // звичайне control word: \par, \tab, \line, \f0, \fs24, ...
      let word = '';
      while (i < n && /[a-zA-Z]/.test(raw[i])) { word += raw[i]; i++; }
      // необов'язковий цифровий параметр
      if (raw[i] === '-') { i++; }
      while (i < n && /[0-9]/.test(raw[i])) i++;
      // роздільник пробіл
      if (raw[i] === ' ') i++;

      if (word === 'par' || word === 'line') out += '\n';
      else if (word === 'tab') out += '\t';
      else if (word === 'u') { /* вже оброблено вище */ }
      // решта control words (fonts, sizes, colors) → ігноруємо
      continue;
    } else {
      // звичайний текст
      out += ch;
      i++;
    }
  }

  // cleanup: множинні пробіли/порожні рядки
  let text = out
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  tick(0.9);

  // title з {\info {\title ...}} — шукаємо у сирому тексті (вже вирізано, але спробуємо regex)
  const titleM = raw.match(/\\title\s+([^{}\\]+)/i);
  tick(1);
  return { text, title: titleM ? titleM[1].trim() : undefined };
}
