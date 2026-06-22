"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { filterByName } from "@/lib/search";
import { cx } from "@/lib/cx";
import listSearch from "@/components/listSearch.module.scss";
import styles from "@/components/CharacterSearchInput/CharacterSearchInput.module.scss";

const MAX_SUGGESTIONS = 8;
const DEFAULT_PLACEHOLDER = "Search characters…";
const DEFAULT_ARIA_LABEL = "Search characters";

export type CharacterSuggestion = {
  slug: string;
  name: string;
  alias: string | null;
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
    <input
      type="search"
      className={listSearch.input}
      placeholder={placeholder ?? DEFAULT_PLACEHOLDER}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel ?? DEFAULT_ARIA_LABEL}
      autoComplete="off"
      spellCheck={false}
    />
  );
}

// In autocomplete mode the input owns its query, ranks matches with the same
// `filterByName` the index uses, and navigates to the chosen character.
function AutocompleteInput({
  items,
  placeholder,
  ariaLabel,
}: AutocompleteProps) {
  const router = useRouter();
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return filterByName(items, q).slice(0, MAX_SUGGESTIONS);
  }, [items, query]);

  const showList = open && suggestions.length > 0;

  const go = (slug: string) => {
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
    router.push(`/characters/${slug}/`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target =
        activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0];
      if (target) go(target.slug);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const activeId =
    showList && activeIndex >= 0
      ? `${listboxId}-opt-${activeIndex}`
      : undefined;

  return (
    <div className={styles.combobox}>
      <input
        type="search"
        role="combobox"
        className={listSearch.input}
        placeholder={placeholder ?? DEFAULT_PLACEHOLDER}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(-1);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label={ariaLabel ?? DEFAULT_ARIA_LABEL}
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        autoComplete="off"
        spellCheck={false}
      />
      {showList && (
        <ul className={styles.listbox} id={listboxId} role="listbox">
          {suggestions.map((s, i) => (
            <li
              key={s.slug}
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={cx(
                styles.option,
                i === activeIndex && styles.optionActive,
              )}
              // Keep focus on the input so the click navigates before blur closes.
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => go(s.slug)}
            >
              <span className={styles.optionName}>{s.name}</span>
              {!!s.alias && (
                <span className={styles.optionAlias}>({s.alias})</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CharacterSearchInput(props: Props) {
  return isAutocomplete(props) ? (
    <AutocompleteInput {...props} />
  ) : (
    <FilterInput {...props} />
  );
}
