import { useSyncExternalStore } from 'react';

/** Minimalistický store pro useSyncExternalStore (místo Reduxu/Zustandu). */
export interface Store<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(next) {
      const value = typeof next === 'function' ? (next as (p: T) => T)(state) : next;
      if (Object.is(value, state)) return;
      state = value;
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useStore<T>(store: Store<T>): T;
export function useStore<T, S>(store: Store<T>, selector: (s: T) => S): S;
export function useStore<T, S>(store: Store<T>, selector?: (s: T) => S): T | S {
  const get: () => T | S = selector ? () => selector(store.get()) : store.get;
  return useSyncExternalStore<T | S>(store.subscribe, get, get);
}
