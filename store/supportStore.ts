// store/supportStore.ts
// Флаг «больше не показывать окно поддержки» после доната/подписки.
// persist → AsyncStorage (как остальные сторы).
import { persist } from './createStore';

interface SupportState {
  dontShowSupport: boolean;
  setDontShowSupport: (v: boolean) => void;
}

export const useSupportStore = persist<SupportState>(
  (set) => ({
    dontShowSupport: false,
    setDontShowSupport: (v) => set({ dontShowSupport: v }),
  }),
  { name: 'bookreader-support' },
);
