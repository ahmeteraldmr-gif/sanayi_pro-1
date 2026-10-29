"use client";

import { useCallback, useSyncExternalStore } from "react";

// All browser persistence lives here. Replace this adapter when a remote repository is introduced.
const cache = new Map<string, unknown>();
const keyListeners = new Map<string, Set<() => void>>();
const pendingWrites = new Map<string, unknown>();
let flushScheduled = false;
let storageAttached = false;
const prefix = "sanayipro:v1:";
const ready = () => true;
const serverReady = () => false;
const noopSubscribe = () => () => {};

export function useLocalReady() {
  return useSyncExternalStore(noopSubscribe, ready, serverReady);
}

function emitKey(key: string) {
  const set = keyListeners.get(key);
  if (!set) return;
  set.forEach((listener) => listener());
}

function ensureStorageListener() {
  if (storageAttached || typeof window === "undefined") return;
  storageAttached = true;
  window.addEventListener("storage", (event: StorageEvent) => {
    if (event.key?.startsWith(prefix)) {
      const changedKey = event.key.slice(prefix.length);
      cache.delete(changedKey);
      emitKey(changedKey);
    }
  });
}

function scheduleFlush() {
  if (flushScheduled || typeof window === "undefined") return;
  flushScheduled = true;
  const run = () => {
    flushScheduled = false;
    for (const [k, val] of pendingWrites.entries()) {
      pendingWrites.delete(k);
      try {
        window.localStorage.setItem(prefix + k, JSON.stringify(val));
      } catch {
        window.dispatchEvent(new CustomEvent("sanayipro:storage-error"));
      }
    }
  };
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 120 });
  } else {
    setTimeout(run, 0);
  }
}

export function useLocalRepository<T>(
  key: string,
  initial: T,
): [T, (update: T | ((current: T) => T)) => void] {
  const subscribeKey = useCallback(
    (listener: () => void) => {
      ensureStorageListener();
      let set = keyListeners.get(key);
      if (!set) {
        set = new Set();
        keyListeners.set(key, set);
      }
      set.add(listener);
      return () => {
        set?.delete(listener);
      };
    },
    [key],
  );

  const read = useCallback((): T => {
    if (cache.has(key)) return cache.get(key) as T;
    try {
      const raw = window.localStorage.getItem(prefix + key);
      const value = raw ? (JSON.parse(raw) as T) : initial;
      cache.set(key, value);
      return value;
    } catch {
      cache.set(key, initial);
      return initial;
    }
  }, [key, initial]);

  const value = useSyncExternalStore(subscribeKey, read, () => initial);

  const write = useCallback(
    (update: T | ((current: T) => T)) => {
      const current = read();
      const next =
        typeof update === "function"
          ? (update as (current: T) => T)(current)
          : update;
      if (Object.is(next, current)) return;
      cache.set(key, next);
      emitKey(key);
      pendingWrites.set(key, next);
      scheduleFlush();
    },
    [key, read],
  );

  return [value, write];
}
