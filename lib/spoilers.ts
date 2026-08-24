import { useSyncExternalStore } from "react";

/**
 * Spoiler mode is a reader's standing preference, not page state: it holds
 * across navigation and reloads and belongs to nobody else, so it lives in
 * `localStorage` rather than the URL that gets shared.
 *
 * The site is statically exported, so the server has no idea which way the
 * switch is set. Every render starts unspoiled and corrects itself once
 * hydration reaches the store — which is the safe direction to be wrong in.
 */
export const SPOILERS_STORAGE_KEY = "tkw:spoilers";

const ON = "on";
const OFF = "off";

const listeners = new Set<() => void>();

// Private browsing can refuse both reads and writes. The preference then lives
// for the session only, which beats a switch that visibly refuses to move.
let fallback = false;

function read(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SPOILERS_STORAGE_KEY) === ON;
  } catch {
    return fallback;
  }
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab is the same reader, so its choice applies here too.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== SPOILERS_STORAGE_KEY) return;
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getServerSnapshot(): boolean {
  return false;
}

export function setSpoilers(next: boolean): void {
  fallback = next;
  try {
    window.localStorage.setItem(SPOILERS_STORAGE_KEY, next ? ON : OFF);
  } catch {
    // Nothing to do: `fallback` already carries it for this session.
  }
  emit();
}

export function useSpoilers(): {
  isShowingSpoilers: boolean;
  toggleSpoilers: () => void;
} {
  const isShowingSpoilers = useSyncExternalStore(
    subscribe,
    read,
    getServerSnapshot,
  );
  return {
    isShowingSpoilers,
    toggleSpoilers: () => setSpoilers(!isShowingSpoilers),
  };
}
