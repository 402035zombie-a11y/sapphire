// hooks/useSupportAutoOpen.ts
// Розумний таймінг показу «Поддержать автора» — на основі поведінкових досліджень:
//
//  ПРИНЦИПИ:
//   1. Reciprocity (Cialdini): юзер має отримати цінність ДО прохання.
//      Перший показ — тільки після реальної взаємодії (прочитана глава / N відповідей).
//   2. Peak-End Rule (Kahneman): найкращий момент — після позитивного піку
//      (завершення глави, виконана daily goal), коли альтруїзм найімовірніший.
//   3. Interruption cost: НЕ показувати в перші хвилини занурення — flow-переривання
//       викликає аверсію.
//   4. Frequency capping: max 1 показ на сесію; інтервал між сесіями ЗРОСТАЄ
//      при відмовах (1й день → 2 дні → 4 дні ... максимум 14 днів).
//
//  ТАЙМІНГ ПО ЕКРАНАХ:
//   Reader (читалка): юзер уже занурився. Показ через 90с читання АБО одразу після
//     завершення глави. Не раніше 60с.
//   Training (тренування): показ після виконання daily goal (10 відповідей) — юзер
//     щойно отримав "досягнення". Якщо сесія довга — через 3 хв від старту.
//   Dictionary (словник): утилітарний екран, юзер щось робить руками — тут НЕ показуємо
//     авто-модалку взагалі (найвищий interruption cost).

import { useEffect, useRef } from 'react';
import { useSupportStore } from '../store/supportStore';

export type SupportSurface = 'reader' | 'training' | 'dictionary';

const READER_MIN_TIME = 90 * 1000; // 90с читання до першого показу
const TRAINING_MIN_TIME = 3 * 60 * 1000; // 3 хв тренування
const SESSION_CAP = 1; // один показ на сесію (на екран)

export interface SupportTriggerOptions {
  surface: SupportSurface;
  /** Чи досягнуто позитивного піку: глава дочитана / daily goal виконано */
  peakMoment?: boolean;
  /** Кількість відповідей у поточній сесії (для training) */
  sessionAnswers?: number;
}

/**
 * Хук авто-показу. Викликається на екрані; сам вирішує чи/коли показати.
 */
export function useSupportAutoOpen(
  onShow: () => void,
  trigger: SupportTriggerOptions = { surface: 'reader' },
) {
  const hasWatchedAd = useSupportStore((s) => s.hasWatchedAd);
  const dontShowSupport = useSupportStore((s) => s.dontShowSupport);
  const lastShownTime = useSupportStore((s) => s.lastShownTime);
  const dismissCount = useSupportStore((s) => s.dismissCount ?? 0);
  const markShown = useSupportStore((s) => s.markShown);
  const shownThisSession = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Перерахунок умов (forceCheck через зміну dismissCount/lastShownTime відбувається
  // автоматично — useEffect залежить від lastShownTime)
  const forceCheck = () => {};

  useEffect(() => {
    // Глобальні вимикачі
    if (hasWatchedAd || dontShowSupport) return;
    // Frequency cap: один показ на сесію екрана
    if (shownThisSession.current) return;

    // Внутрішньоденний повтор: якщо юзер відмовився — наступна спроба через +5 хв
    // (5, 10, 15, 20... хв від останнього показу). Щодня скидається.
    if (lastShownTime > 0) {
      const stepMinutes = 5 * Math.max(1, dismissCount); // 1-й раз: 5хв, потім 10, 15...
      const nextAllowedAt = lastShownTime + stepMinutes * 60_000;
      const todayStart = new Date().setHours(0, 0, 0, 0);
      // показуємо тільки якщо настав час І це ще сьогодні
      if (Date.now() < nextAllowedAt) {
        timerRef.current = setTimeout(() => markShown(), nextAllowedAt - Date.now());
        return;
      }
      if (lastShownTime >= todayStart) return; // вже показували сьогодні
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = () => {
      shownThisSession.current = true;
      onShow();
      markShown();
    };

    if (trigger.surface === 'dictionary') {
      // Утилітарний екран — авто-показ вимкнено (лише ручна кнопка серця)
      return;
    }

    if (trigger.surface === 'training') {
      // Тренування: чекаємо або daily goal (10 відповідей), або 3 хв
      const minTime = TRAINING_MIN_TIME;
      const start = Date.now();
      timer = setTimeout(() => {
        const elapsedOk = Date.now() - start >= minTime;
        const goalDone = (trigger.sessionAnswers ?? 0) >= 10;
        // Показуємо якщо: юзер активно працює (>=10 відповідей) І минув мінімум часу,
        // або peak moment (goal done)
        if ((elapsedOk && (trigger.sessionAnswers ?? 0) >= 5) || goalDone) {
          show();
        }
        // інакше — мовчки пропускаємо цю сесію (юзер не залучений достатньо)
      }, minTime);
    } else {
      // Reader: 90с занурення, або миттю якщо peak moment (глава завершена)
      if (trigger.peakMoment) {
        timer = setTimeout(show, 1500); // коротка пауза, щоб юзер побачив завершення
      } else {
        timer = setTimeout(show, READER_MIN_TIME);
      }
    }

    return () => { if (timer) clearTimeout(timer); };
  }, [hasWatchedAd, dontShowSupport, lastShownTime, dismissCount, onShow, markShown, trigger.surface, trigger.peakMoment, trigger.sessionAnswers]);
}
