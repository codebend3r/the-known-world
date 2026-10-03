import { useRef, useState } from "react";
import type { SearchIndexItem } from "@/lib/search-index";

// Kept out of `lib/search-index` so importing a path never pulls the fetcher
// and its validator into the page bundle. Each file is emitted by the route
// handler at the same path under `app/`.
export const SEARCH_INDEX_PATHS = {
  characters: "/search-index/characters.json",
  houses: "/search-index/houses.json",
} as const;

export type SearchIndexCollection = keyof typeof SEARCH_INDEX_PATHS;

// Nothing is fetched until `load` runs — the field calls it on hover or
// focus — and the fetcher and its validator arrive in their own chunk then too.
export function useSearchIndex(collection: SearchIndexCollection): {
  items: readonly SearchIndexItem[];
  load: () => void;
} {
  const [items, setItems] = useState<readonly SearchIndexItem[]>([]);
  const hasRequestedRef = useRef(false);

  const load = () => {
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;
    import("@/lib/search-index")
      .then(({ fetchSearchIndex }) =>
        fetchSearchIndex(SEARCH_INDEX_PATHS[collection]),
      )
      .then(setItems)
      .catch(() => {
        // The field still takes typing without suggestions; re-arm so the
        // next hover or focus tries again.
        hasRequestedRef.current = false;
      });
  };

  return { items, load };
}
