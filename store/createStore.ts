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
  (selector?: (s: T) => any): any;
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
    return selector ? selector(state) : state;
  }) as UseStoreFn<T>;
  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;
  return useStore;
}

export function persist<T extends object>(
  creator: StoreCreator<T>,
  options?: { name: string; partialize?: (s: T) => any },
): UseStoreFn<T> {
  const useStore = buildStore<T>(creator);
  const key = 'persist:' + (options?.name ?? 'store');
  const load = async () => {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw) useStore.setState(JSON.parse(raw));
    } catch {}
  };
  useStore.subscribe((state: T) => {
    const toSave = options?.partialize ? options.partialize(state) : state;
    AsyncStorage.setItem(key, JSON.stringify(toSave)).catch(() => {});
  });
  load();
  return useStore;
}

export function create<T extends object>(creator: StoreCreator<T>): UseStoreFn<T> {
  return buildStore<T>(creator);
}
