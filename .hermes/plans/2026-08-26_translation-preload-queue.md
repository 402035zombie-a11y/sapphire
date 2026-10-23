# Sapphire — Translation Preload (черга, не в роботі)

## Статус — НЕ АКТИВНО (30.08.2026)

Це план минулої сесії. Всі 12 задач T1-T12 проекту Sapphire/FBookReader виконано до ліквідації:
- T1-T8: парсери, теми, ридер, словник, тренування, i18n — телефонна перевірка успішна.
- T9: Monetization (AdMob real IDs + Donate NowPayments).
- T10: Settings (font, theme, language persisted).
- T11: Publish prep (EAS config, AdMob, privacy policy, icons).
- T12: Plan-log maintenance.

**Translation preload** (черга, не в роботі): ідея була запроваджена в ранніх версіях,
але скасовано на етапі фінального QA через дефекти видимості тіней у чергуванні тем.
Якщо тренд майбутнього випуску — це може бути окремим задачевим завданням з поверненням.

## Що було ЗРОБЛЕНО цією сесією (усього + підсумок)

| Завдання | Результат | Телефон |
|---|---|---|
| T1 парсери | 8 форматів, 0 U+FFFD, MOBI fixture fixed | — |
| T2 tsc | exit 0 | — |
| T3 BookCard states | parsing/saving/ready/error + Cancel/Delete/Retry | ✅ |
| T4 теми | Day/Night/Blackout, inset shadows, без білого outline | ✅ |
| T5 читалка | dual, SpeedReading, TTS, word tap → WordBottomSheet | ✅ |
| T6 словник | 15077 сл., 12 відповідей (✓4/✗8), фільтри, Anki | ✅ |
| T7 тренування | 4 режими, daily goal 10, відповіді, streak | ✅ |
| T8 i18n | 43 мови перекладено, без залишків | ✅ |
| T9 монетизація | AdMob real IDs, Donate NowPayments | кодовий рівень |
| T10 налаштування | Font, theme, language persisted | ✅ |
| T11 publish prep | EAS/Admob/privacy/icons (code-level), AAB не зібраний | — |
| T12 лог-файл | всі 12 задач зафіксовано з результатами | — |

## Файли, що змінились (створено цією сесією)

- `.hermes/plans/implementation-plan-log.md` (T1-T12, всі COMPLETED)
- `.hermes/plans/t11-publish-prep.md` (переписано на COMPLETE code/config)
- `scripts/test-parsers-runner.js` (виправлено MOBI header, RTF API, await, ArrayBuffer)
- `scripts/library-parse-verification-runner.js` (допоміжний runner)
- `scripts/probe-*.js`, `scripts/test-import.js`, `scripts/theme-pixel-audit.py`, `scripts/inset-shadow-audit.py` (діагностичні)
- `services/i18n.ts` (shim для Node-тестерів)
- `docs/content-rating-data-safety.md` (чек-ліст для Play Console)
- `ui*.xml` (UI-дампи при перевірці на телефоні)
- `theme_*.png`, `sapphire1.png`, `lib_check.png` (скріншоти)
- `.test-parsers-bundle/` (збірки парсерів для тестування)

## ОСТАННІ ДЛЯ ПУБЛІКАЦІЇ (T11–T12)

1. **EAS AAB build** — `eas build --profile production --platform android` (free quota).
2. **GitHub Pages** — увімкнути на `402035zombie-a11y/bookreader` для privacy URL.
3. **Android screenshots** — зібрати реальні з телефону (UI мінімум: Library, Reader, Dictionary, Training).
4. **Play Console** — Content Rating + Data Safety form (з `docs/content-rating-data-safety.md`).
5. **Push** — `git push origin fix/ui-bugs` + `eas submit`.
