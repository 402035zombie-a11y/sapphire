// utils/sections.ts
// Извлечение оглавления (разделов) из параграфов книги.
// Эвристика: короткие строки (<= 60 символов), часто заглавными или с номером главы,
// либо содержащие маркеры "Chapter/Nглава/Часть/Section".
import { BookParagraph, BookSection } from '../store/libraryStore';
import { tStatic } from '../i18n';

const SECTION_RE =
  /(^\s*(chapter|часть|глава|section|part|раздел|book|книга)\b)|(^\s*[IVXLCДЕИІ]+\b\.?\s)|(^\s*\d+[\.\)]\s)/i;

export function extractSections(paragraphs: BookParagraph[]): BookSection[] {
  const sections: BookSection[] = [];
  for (const p of paragraphs) {
    const text = p.original.trim();
    if (text.length === 0 || text.length > 70) continue;
    const firstLine = text.split('\n')[0].trim();
    const looksLike =
      SECTION_RE.test(firstLine) ||
      (firstLine === firstLine.toUpperCase() && /[A-ZА-ЯІЇЄ]/.test(firstLine) && firstLine.length <= 50) ||
      /^(chapter|глава|часть|section|part|раздел)\s+/i.test(firstLine);
    if (looksLike) {
      sections.push({ title: firstLine.slice(0, 80), paragraphIndex: p.index });
    }
  }
  // всегда начинаем с первого параграфа, если разделов не нашли
  if (sections.length === 0 && paragraphs.length > 0) {
    sections.push({ title: tStatic('Beginning'), paragraphIndex: 0 });
  }
  return sections;
}
