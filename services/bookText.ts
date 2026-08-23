/**
 * bookText.ts — текст книги з books.db у форматі BookParagraph[].
 * Після переходу store на легкі desc (без тексту) усі, кому потрібен текст
 * (Bookmarks/SpeedReading/Dictionary freq), читають звідси.
 */
import { getBookChapters } from './bookImport';
import { getBooksDb } from './db';
import { splitIntoSegments } from '../utils/sentenceSplitter';
import type { BookParagraph } from '../store/libraryStore';

/** Повне видалення даних книги з books.db (глави + переклади). Викликається з libraryStore.removeBook. */
export function deleteBookData(bookId: string): void {
  const db = getBooksDb();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM chapters WHERE book_id = ?', [bookId]);
    db.runSync('DELETE FROM sentence_translations WHERE book_id = ?', [bookId]);
    db.runSync('DELETE FROM bookmarks WHERE book_id = ?', [bookId]);
    db.runSync('DELETE FROM highlights WHERE book_id = ?', [bookId]);
    db.runSync('DELETE FROM books WHERE id = ?', [bookId]);
  });
}

/** HTML → чистий текст (спільна нормалізація для Reader/bookText). */
export function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function getBookParagraphs(
  bookId: string,
  /** Fallback: старі книги (до міграції) мають текст у libraryStore JSON, а не в БД. */
  fallbackParas?: { index: number; original: string }[]
): BookParagraph[] {
  const dbChapters = getBookChapters(bookId);
  if (!dbChapters.length) {
    return (fallbackParas ?? []).map((p) => ({ index: p.index, original: p.original }));
  }
  const out: BookParagraph[] = [];
  for (const ch of dbChapters) {
    const plain = ch.contentHtml
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim();
    // один paragraph = одна глава-секція; index = ch.idx (глобальний)
    out.push({ index: ch.idx, original: plain });
  }
  return out;
}

/** Речення книги з глобальним ключем paraIndex*1000+si (як у Reader). */
export function getBookSentences(bookId: string): { original: string; index: number }[] {
  const dbChapters = getBookChapters(bookId);
  const out: { original: string; index: number }[] = [];
  for (const ch of dbChapters) {
    const plain = stripHtmlToText(ch.contentHtml);
    splitIntoSegments(plain).forEach((s, si) => out.push({ original: s, index: ch.idx * 1000 + si }));
  }
  return out;
}
