// store/supportStore.ts
// Флаги окна поддержки автора.
// - dontShowSupport: пользователь задонатил/отписался → больше не показывать
// - hasWatchedAd: пользователь посмотрел рекламу → больше не показывать (добровольно поддержал)
// - lastShownTime: когда в последний раз показывали окно (для интервала 5 мин)
// persist → AsyncStorage (как остальные сторы).
import { persist } from './createStore';

interface SupportState {
  dontShowSupport: boolean;
  setDontShowSupport: (v: boolean) => void;
  hasWatchedAd: boolean;
  markAdWatched: () => void;
  lastShownTime: number;
  markShown: () => void;
}

export const useSupportStore = persist<SupportState>(
  (set) => ({
    dontShowSupport: false,
    setDontShowSupport: (v) => set({ dontShowSupport: v }),
    hasWatchedAd: false,
    markAdWatched: () => set({ hasWatchedAd: true }),
    lastShownTime: 0,
    markShown: () => set({ lastShownTime: Date.now() }),
  }),
  { name: 'bookreader-support' },
);
