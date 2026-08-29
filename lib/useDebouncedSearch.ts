import { useEffect, useRef, useState } from "react";

export const SEARCH_DEBOUNCE_MS = 300;

/**
 * The list pages' search box: type freely, write to the URL on a pause.
 *
 * Three values rather than one, because the URL is both an input and an
 * output. `undefined` means "the reader has not typed yet", so the field and
 * the filter both fall back to whatever the URL arrived with — a shared or
 * reloaded `?search=` renders its results immediately. Once typing starts,
 * the local value leads and the URL follows a beat later.
 *
 * `commit` is read through a ref so a caller can pass an inline arrow. The
 * effect depends on the debounced value alone; re-running it because a
 * closure changed identity would write the same search back on every render.
 */
export function useDebouncedSearch({
  urlValue,
  commit,
}: {
  urlValue: string;
  commit: (search: string) => void;
}): {
  /** What the input shows. */
  value: string;
  /** What the list filters by. */
  debounced: string;
  onChange: (next: string) => void;
} {
  const [typed, setTyped] = useState<string | undefined>(undefined);
  const [settled, setSettled] = useState<string | undefined>(undefined);

  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });

  useEffect(() => {
    if (typed === undefined) return;
    const timer = setTimeout(() => setSettled(typed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [typed]);

  useEffect(() => {
    if (settled === undefined) return;
    commitRef.current(settled);
  }, [settled]);

  return {
    value: typed ?? urlValue,
    debounced: settled ?? urlValue,
    onChange: setTyped,
  };
}
