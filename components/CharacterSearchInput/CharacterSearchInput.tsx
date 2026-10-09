"use client";

import { SearchCombobox } from "@/components/SearchCombobox";
import { ListSearchInput } from "@/components/ListSearchInput";
import { useSearchIndex } from "@/lib/useSearchIndex";

const DEFAULT_PLACEHOLDER = "Search characters…";
const DEFAULT_ARIA_LABEL = "Search characters";

type CommonProps = {
  placeholder?: string;
  ariaLabel?: string;
};

type FilterProps = CommonProps & {
  hasAutocomplete?: false;
  value: string;
  onChange: (value: string) => void;
};

type AutocompleteProps = CommonProps & {
  hasAutocomplete: true;
};

type Props = FilterProps | AutocompleteProps;

function isAutocomplete(props: Props): props is AutocompleteProps {
  return props.hasAutocomplete === true;
}

// In filter mode the input is fully controlled by its parent (the characters
// index filters its list in place). No suggestions, no navigation — just the
// shared styled field, so the index keeps its exact grid/sort/view layout.
function FilterInput({ value, onChange, placeholder, ariaLabel }: FilterProps) {
  return (
    <ListSearchInput
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? DEFAULT_PLACEHOLDER}
      ariaLabel={ariaLabel ?? DEFAULT_ARIA_LABEL}
    />
  );
}

// In autocomplete mode the shared combobox owns the query, ranks matches, and
// navigates to the chosen character. The roll of characters is fetched on first
// hover or focus rather than shipped with the page.
function AutocompleteInput({ placeholder, ariaLabel }: AutocompleteProps) {
  const { items, load } = useSearchIndex("characters");
  return (
    <SearchCombobox
      items={items}
      onIntent={load}
      basePath="/characters"
      placeholder={placeholder ?? DEFAULT_PLACEHOLDER}
      ariaLabel={ariaLabel ?? DEFAULT_ARIA_LABEL}
    />
  );
}

export function CharacterSearchInput(props: Props) {
  return isAutocomplete(props) ? (
    <AutocompleteInput {...props} />
  ) : (
    <FilterInput {...props} />
  );
}
