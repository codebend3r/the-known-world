import { useQueryState } from "nuqs";
import { searchParser } from "@/lib/listSearchParams";
import { filterByName } from "@/lib/search";
import { useDebouncedSearch } from "@/lib/useDebouncedSearch";

/**
 * The unpaged list pages' search: a debounced `?search=` that filters `items`
 * by name. Returns the field's props alongside the filtered items.
 */
export function useUrlSearchFilter<
  T extends { name: string; aliases?: readonly string[] },
>({
  items,
}: {
  items: readonly T[];
}): {
  value: string;
  debounced: string;
  onChange: (next: string) => void;
  filtered: T[];
} {
  const [urlSearch, setUrlSearch] = useQueryState("search", searchParser);
  const { value, debounced, onChange } = useDebouncedSearch({
    urlValue: urlSearch,
    commit: setUrlSearch,
  });
  return {
    value,
    debounced,
    onChange,
    filtered: filterByName({ items, query: debounced }),
  };
}
