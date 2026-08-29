"use client";

import { SearchCombobox } from "@/components/SearchCombobox";
import { ListSearchInput } from "@/components/ListSearchInput";

const DEFAULT_PLACEHOLDER = "Search characters…";
const DEFAULT_ARIA_LABEL = "Search characters";

export type CharacterSuggestion = {
  slug: string;
  name: string;
  alias: string | null;
  aliases: string[];
};

type CommonProps = {
  placeholder?: string;
  ariaLabel?: string;
};

type FilterProps = CommonProps & {
  autocomplete?: false;
  value: string;
  onChange: (value: string) => void;
};

type AutocompleteProps = CommonProps & {
  autocomplete: true;
  items: readonly CharacterSuggestion[];
};

type Props = FilterProps | AutocompleteProps;

function isAutocomplete(props: Props): props is AutocompleteProps {
  return props.autocomplete === true;
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
// navigates to the chosen character. The first alias is the muted datum beside
// the name; the full array still feeds the ranking.
function AutocompleteInput({
  items,
  placeholder,
  ariaLabel,
}: AutocompleteProps) {
  return (
    <SearchCombobox
      items={items.map((c) => ({
        slug: c.slug,
        name: c.name,
        detail: c.alias,
        aliases: c.aliases,
      }))}
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
