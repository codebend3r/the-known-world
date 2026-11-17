import { useMemo } from "react";
import { useQueryStates } from "nuqs";
import { compareByName } from "@/lib/collections";
import {
  DEFAULT_PAGE_SIZE,
  isPageSize,
  listSearchParsers,
  type PageSize,
  type SortDirection,
} from "@/lib/listSearchParams";
import { useDebouncedSearch } from "@/lib/useDebouncedSearch";

/**
 * The paged list pages' shared URL state: debounced `?search=`, `?dir=`,
 * `?size=` and `?page=`, plus the items sorted by name in the chosen
 * direction. Every change other than paging sends the reader back to page 1.
 */
export function useListQuery<T extends { name: string }>({
  items,
  pageSize,
}: {
  items: readonly T[];
  pageSize: number;
}) {
  const sizeDefault: PageSize = isPageSize(pageSize)
    ? pageSize
    : DEFAULT_PAGE_SIZE;
  const parsers = useMemo(() => listSearchParsers(sizeDefault), [sizeDefault]);
  const [{ search, dir, size, page }, setParams] = useQueryStates(parsers);

  const { value, debounced, onChange } = useDebouncedSearch({
    urlValue: search,
    commit: (next) => setParams({ search: next, page: 1 }),
  });

  const sorted = useMemo(() => {
    const arr = items.toSorted(compareByName);
    return dir === "desc" ? arr.toReversed() : arr;
  }, [items, dir]);

  return {
    value,
    debounced,
    onChange,
    dir,
    size,
    page,
    sorted,
    setDir: (next: SortDirection) => setParams({ dir: next, page: 1 }),
    setPage: (next: number) => setParams({ page: next }),
    setSize: (next: PageSize) => setParams({ size: next, page: 1 }),
    resetPage: () => setParams({ page: 1 }),
  };
}
