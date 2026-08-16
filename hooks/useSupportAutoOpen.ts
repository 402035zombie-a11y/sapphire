// hooks/useSupportAutoOpen.ts
// Авто-открытие окна «Поддержать автора» по таймингу:
// - первый раз: через 30с после первого открытия любого экрана (если ещё не смотрел рекламу)
// - повторно (и далее): каждые 5 минут, если пользователь не посмотрел рекламу
// - если посмотрел рекламу (hasWatchedAd) или отписался (dontShowSupport) → не показываем
import { useEffect } from 'react';
import { useSupportStore } from '../store/supportStore';

const FIRST_DELAY = 30 * 1000; // 30s
const REPEAT_INTERVAL = 5 * 60 * 1000; // 5 min

export function useSupportAutoOpen(onShow: () => void) {
  const hasWatchedAd = useSupportStore((s) => s.hasWatchedAd);
  const dontShowSupport = useSupportStore((s) => s.dontShowSupport);
  const lastShownTime = useSupportStore((s) => s.lastShownTime);
  const markShown = useSupportStore((s) => s.markShown);

  useEffect(() => {
    if (hasWatchedAd || dontShowSupport) return;

    let timer: ReturnType<typeof setTimeout>;
    let interval: ReturnType<typeof setInterval>;

    const show = () => {
      onShow();
      markShown();
    };

    if (lastShownTime === 0) {
      // первый раз: через 30с после открытия
      timer = setTimeout(show, FIRST_DELAY);
    } else {
      // повторно: каждые 5 минут
      const elapsed = Date.now() - lastShownTime;
      const wait = Math.max(0, REPEAT_INTERVAL - elapsed);
      timer = setTimeout(() => {
        show();
        interval = setInterval(show, REPEAT_INTERVAL);
      }, wait);
    }

    return () => {
      clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, [hasWatchedAd, dontShowSupport, lastShownTime, onShow, markShown]);
}
