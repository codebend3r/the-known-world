import { SearchCombobox } from "@/components/SearchCombobox";

const DEFAULT_PLACEHOLDER = "Search houses…";
const DEFAULT_ARIA_LABEL = "Search houses";

export type HouseSuggestion = {
  slug: string;
  name: string;
  region: string | null;
};

type Props = {
  items: readonly HouseSuggestion[];
  placeholder?: string;
  ariaLabel?: string;
};

// The house plate's jump-to-house field. Houses carry no `aliases`, so the
// muted parenthetical on an option is the region instead — the same datum the
// register card hangs beside a house name.
export function HouseSearchInput({ items, placeholder, ariaLabel }: Props) {
  return (
    <SearchCombobox
      items={items.map((h) => ({
        slug: h.slug,
        name: h.name,
        detail: h.region,
        aliases: [],
      }))}
      basePath="/houses"
      placeholder={placeholder ?? DEFAULT_PLACEHOLDER}
      ariaLabel={ariaLabel ?? DEFAULT_ARIA_LABEL}
    />
  );
}
