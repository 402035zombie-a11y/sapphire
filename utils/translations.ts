// utils/translations.ts
// Утиліта для парсингу та валідації множинних варіантів перекладу слів (multi-translations)

/**
 * Розбиває рядок перекладу на масив варіантів (роздільники: кома, крапка з комою, слеш, новий рядок).
 * Очищає зайві пробіли та дублікати.
 */
export function splitTranslations(rawTranslation: string): string[] {
  if (!rawTranslation) return [];
  const parts = rawTranslation
    .split(/[,;/|\n\r]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    const norm = p.toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      unique.push(p);
    }
  }
  return unique.length > 0 ? unique : [rawTranslation.trim()];
}

/**
 * Перевіряє, чи введена користувачем відповідь збігається хоча б з одним із варіантів перекладу.
 */
export function matchAnyTranslation(userAnswer: string, expectedTranslation: string): boolean {
  if (!userAnswer || !expectedTranslation) return false;
  const normUser = userAnswer.trim().toLowerCase().replace(/[.,!?;:]/g, '');
  if (!normUser) return false;
  
  const variants = splitTranslations(expectedTranslation);
  return variants.some((v) => {
    const normV = v.trim().toLowerCase().replace(/[.,!?;:]/g, '');
    return normV === normUser;
  });
}
