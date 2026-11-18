"use client";

import { EntitySearchInput } from "@/components/EntitySearchInput";
import { ListSearchInput } from "@/components/ListSearchInput";

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

export function CharacterSearchInput(props: Props) {
  if (isAutocomplete(props)) {
    return (
      <EntitySearchInput
        collection="characters"
        placeholder={props.placeholder}
        ariaLabel={props.ariaLabel}
      />
    );
  }
  return <FilterInput {...props} />;
}
