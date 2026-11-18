"use client";

import { SearchCombobox } from "@/components/SearchCombobox";
import {
  useSearchIndex,
  type SearchIndexCollection,
} from "@/lib/useSearchIndex";

type Props = {
  collection: SearchIndexCollection;
  placeholder?: string;
  ariaLabel?: string;
};

// A plate's jump-to-entry field: the shared combobox owns the query, ranks
// matches, and navigates to the chosen entry. The collection's roll is fetched
// on first hover or focus rather than shipped with the page.
export function EntitySearchInput({
  collection,
  placeholder,
  ariaLabel,
}: Props) {
  const { items, load } = useSearchIndex(collection);
  return (
    <SearchCombobox
      items={items}
      onIntent={load}
      basePath={`/${collection}`}
      placeholder={placeholder ?? `Search ${collection}…`}
      ariaLabel={ariaLabel ?? `Search ${collection}`}
    />
  );
}
