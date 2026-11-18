import { useCallback, useSyncExternalStore } from "react";

/**
 * A reader's standing choice for one control (grid or list, flat or grouped),
 * kept in `localStorage` so it survives reloads. The server cannot see the
 * store, so every render starts on `fallback` and corrects itself once
 * hydration reaches the client snapshot.
 */

const listeners = new Set<() => void>();

// Private browsing can refuse both reads and writes. The choice then lives for
// the session only, which beats a toggle that visibly refuses to move.
const sessionFallback = new Map<string, string>();

function readStored(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return sessionFallback.get(key) ?? null;
  }
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", emit);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", emit);
  };
}

function writePersistedChoice({
  key,
  value,
}: {
  key: string;
  value: string;
}): void {
  sessionFallback.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Nothing to do: `sessionFallback` already carries it for this session.
  }
  emit();
}

export function usePersistedChoice<T extends string>({
  key,
  fallback,
  isChoice,
}: {
  key: string;
  fallback: T;
  isChoice: (value: unknown) => value is T;
}): [T, (next: T) => void] {
  const getSnapshot = useCallback((): T => {
    const stored = readStored(key);
    return isChoice(stored) ? stored : fallback;
  }, [key, fallback, isChoice]);
  const getServerSnapshot = useCallback((): T => fallback, [fallback]);
  const choice = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const setChoice = useCallback(
    (next: T) => writePersistedChoice({ key, value: next }),
    [key],
  );
  return [choice, setChoice];
}
