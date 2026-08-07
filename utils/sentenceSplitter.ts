// utils/sentenceSplitter.ts
// Разбиение текста на предложения. Мультиязычный эвристический вариант:
// не режет на аббревиатурах (Dr., etc., г-н) и десятичных дробях (3.14),
// граница — терминальная пунктуация + пробел + большая буква/кавычка/цифра/конец.
const ABBREV = /(mr|mrs|ms|dr|prof|etc|vs|jr|sr|st|fig|e\.g|i\.e|vol|no|al|co|inc|ltd|г-н|г-жа|тов|см|стр|рис|т\.д|т\.п)$/i;
const TERMINAL = '.!?…';

export function splitIntoSentences(text: string): string[] {
  if (!text || !text.trim()) return [];

  const out: string[] = [];
  let start = 0;
  const n = text.length;

  for (let i = 1; i < n; i++) {
    const c = text[i];
    if (!TERMINAL.includes(c)) continue;

    // десятичная дробь: цифра до и цифра после точки
    const before = text[i - 1] ?? '';
    const afterRun = text.slice(i + 1).match(/\S*/)?.[0] ?? '';
    if (c === '.' && /\d/.test(before) && /^\d/.test(afterRun)) continue;

    // пропускаем пробелы после пунктуации
    let j = i + 1;
    while (j < n && /\s/.test(text[j])) j++;
    const next = text[j] ?? '';

    const isBoundary =
      j >= n || /[A-ZА-ЯЁ«"'(«0-9]/.test(next);

    if (isBoundary) {
      const seg = text.slice(start, i + 1).trim();
      if (seg) out.push(seg);
      start = j;
      i = j - 1;
    }
  }

  const tail = text.slice(start).trim();
  if (tail) out.push(tail);

  // склеиваем «висячие» аббревиатуры: короткий кусок без пробела-заглавной следом
  return mergeAbbrevFragments(out);
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
