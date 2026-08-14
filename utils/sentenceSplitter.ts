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

export function splitIntoSentences(text: string): string[] {
  if (!text || !text.trim()) return [];

  const out: string[] = [];
  let start = 0;
  const n = text.length;

  const isBoundaryAt = (i: number): boolean => {
    const c = text[i];
    if (!TERMINAL.includes(c)) return false;
    const before = text[i - 1] ?? '';
    const afterRun = text.slice(i + 1).match(/\S*/)?.[0] ?? '';
    if (c === '.' && /\d/.test(before) && /^\d/.test(afterRun)) return false;
    let j = i + 1;
    while (j < n && /\s/.test(text[j])) j++;
    const next = text[j] ?? '';
    const nextIsBoundary = j >= n || /[A-ZА-ЯЄЇІҐЁ«"'(«0-9]/.test(next);
    if (!nextIsBoundary) return false;
    // если текущий накопленный кусок содержит пункт списка (маркер в начале или сразу после переноса строки),
    // режем ТОЛЬКО если следующий тоже пункт списка
    const curSeg = text.slice(start, i + 1).trim();
    if (hasListMarker(curSeg)) {
      const rest = text.slice(j).trimStart();
      return isListItem(rest) || !rest; // конец списка или конец текста
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
    if (isListItem(sentences[i])) {
      // собираем цепочку пунктов списка подряд
      let chain = sentences[i];
      let k = i + 1;
      while (k < sentences.length && isListItem(sentences[k])) {
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
