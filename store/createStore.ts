// store/createStore.ts
// Минимальный аналог zustand (create + persist) без ESM/`import.meta`,
// чтобы web-бандл грузился как обычный <script>.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';

type Listener<T> = (state: T, prev: T) => void;
type SetState<T> = (partial: Partial<T> | ((s: T) => Partial<T>)) => void;
type GetState<T> = () => T;
type StoreCreator<T> = (set: SetState<T>, get: GetState<T>) => T;

interface UseStoreFn<T> {
  <U = T>(selector?: (s: T) => U): U;
  getState: GetState<T>;
  setState: SetState<T>;
  subscribe: (l: Listener<T>) => () => void;
}

function buildStore<T extends object>(creator: StoreCreator<T>): UseStoreFn<T> {
  let state: T = {} as T;
  const listeners = new Set<Listener<T>>();

  const setState: SetState<T> = (partial) => {
    const next = typeof partial === 'function' ? (partial as any)(state) : partial;
    const prev = state;
    state = { ...state, ...next };
    listeners.forEach((l) => l(state, prev));
  };
  const getState = () => state;
  const subscribe = (l: Listener<T>) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  };

  state = creator(setState, getState);

  const useStore = ((selector?: (s: T) => any) => {
    const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);
    React.useEffect(() => {
      const unsub = subscribe(() => forceUpdate());
      return unsub;
    }, []);
    return (selector ? selector(state) : state) as any;
  }) as unknown as UseStoreFn<T>;
  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;
  return useStore;
}

export function persist<T extends object>(
  creator: StoreCreator<T>,
  options?: {
    name: string;
    partialize?: (s: T) => any;
    onRehydrateStorage?: () => (state: T | undefined) => void;
  },
): UseStoreFn<T> {
  const useStore = buildStore<T>(creator);
  const key = 'persist:' + (options?.name ?? 'store');
  const load = async () => {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        // дедупликация словаря по word|lang при восстановлении (старые данные могли дублироваться)
        if (Array.isArray((parsed as any).entries)) {
          const seen = new Set<string>();
          (parsed as any).entries = (parsed as any).entries.filter((e: any) => {
            if (!e || !e.word) return false;
            const k = `${String(e.word).trim().toLowerCase()}|${e.lang || ''}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
        }
        if (typeof options?.onRehydrateStorage === 'function') {
          const cb = options.onRehydrateStorage();
          if (typeof cb === 'function') cb(parsed as T | undefined);
        }
        useStore.setState(parsed);
      }
    } catch {}
  };
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  useStore.subscribe((state: T) => {
    const toSave = options?.partialize ? options.partialize(state) : state;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      AsyncStorage.setItem(key, JSON.stringify(toSave)).catch(() => {});
    }, 600);
  });
  load();
  return useStore;
}

export function create<T extends object>(creator: StoreCreator<T>): UseStoreFn<T> {
  return buildStore<T>(creator);
}
