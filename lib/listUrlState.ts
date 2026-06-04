import type { SortDirection } from "@/components/SortToggle";

export const SEARCH_PARAM = "search";
export const DIR_PARAM = "dir";
export const SIZE_PARAM = "size";
// `history.replaceState` does not fire `popstate`, so writes to the URL would
// be invisible to `useSyncExternalStore`. Dispatching this synthetic event
// after every write keeps the snapshot in sync.
export const URL_CHANGE_EVENT = "tkw:urlchange";
export const DEFAULT_DIR: SortDirection = "asc";

export const PAGE_SIZE_OPTIONS: ReadonlyArray<{
  value: number;
  label: string;
}> = [
  { value: 16, label: "16" },
  { value: 32, label: "32" },
  { value: 64, label: "64" },
  { value: 128, label: "128" },
];
export const PAGE_SIZE_VALUES: ReadonlySet<number> = new Set(
  PAGE_SIZE_OPTIONS.map((o) => o.value),
);
export const MIN_PAGE_SIZE = 16;

export function isSortDirection(value: unknown): value is SortDirection {
  return value === "asc" || value === "desc";
}

export function readUrlSearch(): string {
  if (typeof window === "undefined") return "";
  return window.location.search;
}

export function getServerSnapshot(): string {
  return "";
}

export function subscribeToUrlChange(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("popstate", callback);
  window.addEventListener(URL_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(URL_CHANGE_EVENT, callback);
  };
}

export function parseUrlSearch(
  searchString: string,
  defaultSize: number,
): { search: string; dir: SortDirection; size: number } {
  const params = new URLSearchParams(searchString);
  const dirRaw = params.get(DIR_PARAM);
  const sizeRaw = Number(params.get(SIZE_PARAM));
  return {
    search: params.get(SEARCH_PARAM) ?? "",
    dir: isSortDirection(dirRaw) ? dirRaw : DEFAULT_DIR,
    size: PAGE_SIZE_VALUES.has(sizeRaw) ? sizeRaw : defaultSize,
  };
}

export function writeUrlParam({
  name,
  value,
  defaultValue,
}: {
  name: string;
  value: string;
  defaultValue: string;
}) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (!value || value === defaultValue) {
    params.delete(name);
  } else {
    params.set(name, value);
  }
  const query = params.toString();
  const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", next);
  window.dispatchEvent(new Event(URL_CHANGE_EVENT));
}
