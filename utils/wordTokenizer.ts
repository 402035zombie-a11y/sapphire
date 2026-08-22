// utils/wordTokenizer.ts
// Токенизация и нормализация слова для словаря.
export function normalizeWord(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{M}]/gu, '') // оставляем ТОЛЬКО буквы и диакритику (убираем цифры, дефисы, пунктуацию)
    .trim();
}

// из предложения достаём «чистые» слова (для возможной статистики/тренировок)
export function extractWords(sentence: string): string[] {
  return sentence
    .split(/\s+/)
    .map(normalizeWord)
    .filter((w) => w.length > 1);
}
