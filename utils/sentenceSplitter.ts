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
      // curSeg ЦЕ ЛИШЕ маркер (напр. "001." без тексту) → не boundary, накопичуємо далі
      if (curSeg.replace(/[\s.)\]]*$/, '') === curSeg.match(/^\s*(?:\d+|[a-zA-Z]|[ivxlcdm]+|[IVXLCDM]+)/)?.[0]?.trim()) return false;
      // Якщо після крапки йде ВЕЛИКА літера — це початок нового речення (напр. "001. The board... 002. The startup"),
      // а не маркер списку. Ріжемо як речення, інакше нумеровані речення склеюються в один блок.
      const nextIsSentenceStart = /[A-ZА-ЯЄЇІҐЁ«"'(«]/.test(next);
      if (nextIsSentenceStart) return true;
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
    .replace(/
\n/g, '\n')
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
