"use client";

import { SearchCombobox } from "@/components/SearchCombobox";
import { useSearchIndex } from "@/lib/useSearchIndex";

const DEFAULT_PLACEHOLDER = "Search houses…";
const DEFAULT_ARIA_LABEL = "Search houses";

type Props = {
  placeholder?: string;
  ariaLabel?: string;
};

// The house plate's jump-to-house field. Houses carry no `aliases`, so the
// muted parenthetical on an option is the region instead — the same datum the
// register card hangs beside a house name. The roll is fetched on first hover
// or focus rather than shipped with the page.
export function HouseSearchInput({ placeholder, ariaLabel }: Props) {
  const { items, load } = useSearchIndex("houses");
  return (
    <SearchCombobox
      items={items}
      onIntent={load}
      basePath="/houses"
      placeholder={placeholder ?? DEFAULT_PLACEHOLDER}
      ariaLabel={ariaLabel ?? DEFAULT_ARIA_LABEL}
    />
  );
}
