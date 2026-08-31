// utils/sentenceSplitter.ts
// Разбиение текста на предложения. Мультиязычный эвристический вариант:
// не режет на аббревиатурах (Dr., etc., г-н) и десятичных дробях (3.14),
// граница — терминальная пунктуация + пробел + большая буква/кавычка/цифра/конец.
// Подряд идущие пункты списков (1. 2. 3. / - * • / a) б)) склеиваются в одну строку,
// чтобы парсер не дробил список на отдельные абзацы.
const ABBREV = /(mr|mrs|ms|dr|prof|etc|vs|jr|sr|st|fig|e\.g|i\.e|vol|no|al|co|inc|ltd|г-н|г-жа|тов|см|стр|рис|т\.д|т\.п)$/i;
const TERMINAL = '.!?…';

// маркер начала пункта списка: 1. 1) a. a) - * • • (i) II. и т.п.
const LIST_MARKER = /^(\s*)(?:(?:\d+|[a-zA-Z]|[ivxlcdm]+|[IVXLCDM]+)[.)]|[-*•‣▪·◦▪])(\s|$)/;

export function isListItem(s: string): boolean {
  return LIST_MARKER.test(s.trim());
}

// пункт списка может идти не с начала строки (перед ним вводной текст + перенос строки)
function hasListMarker(s: string): boolean {
  const t = s.trim();
  if (isListItem(t)) return true;
  return /\n\s*(?:(?:\d+|[a-zA-Z]|[ivxlcdm]+|[IVXLCDM]+)[.)]|[-*•‣▪·◦▪])\s/.test(s);
}

// Перевірка, чи починається сегмент text[start..] з маркера списку (БЕЗ slice).
function hasListMarkerAt(text: string, start: number): boolean {
  let k = start;
  while (k < text.length && /\s/.test(text[k])) k++;
  return isListItemAt(text, k);
}

// Чи є маркер списку на позиції k (числовий/буквений/римський + [.)] або тире/крапка)
function isListItemAt(text: string, k: number): boolean {
  if (k >= text.length) return false;
  const c = text[k];
  if ('-*•‣▪·◦▪'.includes(c)) return true;
  let m = k;
  while (m < text.length && /[0-9a-zA-ZivxlcdmIVXLCDM]/.test(text[m])) m++;
  if (m === k) return false;
  if (m >= text.length) return false;
  const sep = text[m];
  if (sep !== '.' && sep !== ')') return false;
  const after = text[m + 1] ?? '';
  return m + 1 >= text.length || /\s/.test(after);
}

// Довжина маркера списку на позиції start (від пробілів до кінця маркера включно).
function listMarkerLenAt(text: string, start: number): number {
  let k = start;
  while (k < text.length && /\s/.test(text[k])) k++;
  const begin = k;
  if ('-*•‣▪·◦▪'.includes(text[k])) return k - start + 1;
  while (k < text.length && /[0-9a-zA-ZivxlcdmIVXLCDM]/.test(text[k])) k++;
  if (k === begin) return 0;
  if (text[k] === '.' || text[k] === ')') k++;
  else return 0;
  return k - start;
}

export function splitIntoSentences(text: string): string[] {
  if (!text || !text.trim()) return [];

  const out: string[] = [];
  let start = 0;
  const n = text.length;

  const isBoundaryAt = (i: number): boolean => {
    const c = text[i];
    if (!TERMINAL.includes(c)) return false;
    const before = text[i - 1] ?? '';
    // Пропускаємо пробіли після термінала БЕЗ slice (O(1) на символ, а не O(n) копіювання)
    let j = i + 1;
    while (j < n && /\s/.test(text[j])) j++;
    const next = text[j] ?? '';
    const nextIsBoundary = j >= n || /[A-ZА-ЯЄЇІҐЁ«"'(«0-9]/.test(next);
    if (!nextIsBoundary) return false;
    // Десяткові дроби "3.14" — НЕ режемо
    if (c === '.' && /\d/.test(before) && /\d/.test(next)) return false;
    // якщо поточний накопичений сегмент — пункт списку, перевіряємо початок сегмента БЕЗ slice
    if (hasListMarkerAt(text, start)) {
      // curSeg = text[start..i]. Якщо це ЛИШЕ маркер (напр. "001.") → не boundary
      const markerLen = listMarkerLenAt(text, start);
      if (markerLen > 0 && start + markerLen >= i + 1) return false;
      // Якщо після крапки йде ВЕЛИКА літера — початок нового речення
      const nextIsSentenceStart = /[A-ZА-ЯЄЇІҐЁ«"'(«]/.test(next);
      if (nextIsSentenceStart) return true;
      // кінець списку або кінець тексту
      const rest = text.slice(j).trimStart();
      return isListItem(rest) || !rest;
    }
    return true;
  };

  for (let i = 1; i < n; i++) {
    if (!isBoundaryAt(i)) continue;
    let j = i + 1;
    while (j < n && /\s/.test(text[j])) j++;
    const seg = text.slice(start, i + 1).trim();
    if (seg) out.push(seg);
    start = j;
    i = j - 1;
  }

  const tail = text.slice(start).trim();
  if (tail) out.push(tail);

  // склеиваем «висячие» аббревиатуры: короткий кусок без пробела-заглавной следом
  const merged = mergeAbbrevFragments(out);
  // склеиваем подряд идущие пункты списков в одну строку
  return mergeListItems(merged);
}

function mergeListItems(sentences: string[]): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < sentences.length) {
    // склеюємо тільки КОРОТКІ елементи списку (<80 сим) — реальні списки.
    // Довгі "елементи" (нумеровані речення "001. The board...") НЕ склеюємо → лишаються окремими реченнями.
    if (isListItem(sentences[i]) && sentences[i].length < 80) {
      // собираем цепочку пунктов списка подряд
      let chain = sentences[i];
      let k = i + 1;
      while (k < sentences.length && isListItem(sentences[k]) && sentences[k].length < 80) {
        chain += ' ' + sentences[k];
        k++;
      }
      result.push(chain.trim());
      i = k;
    } else {
      result.push(sentences[i]);
      i++;
    }
  }
  return result;
}

function mergeAbbrevFragments(sentences: string[]): string[] {
  const merged: string[] = [];
  for (const s of sentences) {
    const prev = merged[merged.length - 1];
    if (prev && ABBREV.test(prev.replace(/[.!?…]+$/, '')) && !/[.!?…]$/.test(prev)) {
      merged[merged.length - 1] = `${prev} ${s}`;
    } else {
      merged.push(s);
    }
  }
  return merged;
}

// Разбиение текста на сегменты (предложения).
// ВАЖЛИВО: одинарные переносы строк (\n) внутри абзаца — это Gutenberg-wrap,
// НЕ граница предложения. Склеиваем их в пробел, иначе предложение
// режется посередине (каждый wrapped-рядок становится отдельным блоком).
// Граница предложения — только терминальная пунктуация (.!?…) + заглавная/цифра.
export function splitIntoSegments(text: string): string[] {
  if (!text || !text.trim()) return [];
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]*\n[ \t]*/g, ' ') // одинарный \n (wrap) -> пробел
    .replace(/ {2,}/g, ' ')
    .trim();
  const parts = splitIntoSentences(normalized);
  // Довге речення (>maxChars) дробимо на частини по : ; — мовно-нейтрально.
  // Одне речення = одна секція (або кілька, якщо воно дуже довге).
  const MAX_SENT_CHARS = 200;
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((s) => splitLongSentence(s, MAX_SENT_CHARS));
}

// Мовно-нейтральне дроблення ДОВГОГО речення на частини — тільки по знаках, які є
// в усіх мовах (: ;). Слова-сполучники (and/but/і/але) НЕ використовуємо — вони неперекладувані.
// Правило: частина після знака мусить починатися з малого рядка і бути >= MIN_PART (інакше
// це час/абревіатура/перелік — не ріжемо). Одне речення = максимум кілька секцій, сенс не ріжемо.
const SUB_SPLIT_MIN_PART = 40; // коротші хвости не відокремлюємо

function splitLongSentence(sentence: string, maxChars: number): string[] {
  if (sentence.length <= maxChars) return [sentence];
  const cuts: number[] = [];
  for (let i = 0; i < sentence.length; i++) {
    const c = sentence[i];
    if (c !== ':' && c !== ';') continue;
    let j = i + 1;
    while (j < sentence.length && /\s/.test(sentence[j])) j++;
    const rest = sentence.slice(j);
    if (rest.length < SUB_SPLIT_MIN_PART) continue;
    // після розрізу має йти продовження речення з малої літери (не список/цитата/нове речення)
    if (/^[A-ZА-ЯЄЇІҐЁ«"']/.test(rest)) continue;
    cuts.push(j);
  }
  if (cuts.length === 0) return [sentence];
  const out: string[] = [];
  let prev = 0;
  for (const cut of cuts) {
    const part = sentence.slice(prev, cut).trim();
    if (part) out.push(part);
    prev = cut;
  }
  const tail = sentence.slice(prev).trim();
  if (tail) out.push(tail);
  return out;
}
