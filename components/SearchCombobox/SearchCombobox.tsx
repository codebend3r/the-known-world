"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { filterByName } from "@/lib/search";
import { cx } from "@/lib/cx";
import listSearch from "@/components/listSearch.module.scss";
import styles from "@/components/SearchCombobox/SearchCombobox.module.scss";

const MAX_SUGGESTIONS = 8;

export type ComboboxItem = {
  slug: string;
  name: string;
  // The muted parenthetical beside the name: an alias, a region, a byname.
  detail: string | null;
  aliases: readonly string[];
};

type Props = {
  items: readonly ComboboxItem[];
  // Collection root the chosen slug hangs off, e.g. `/houses`.
  basePath: string;
  placeholder: string;
  ariaLabel: string;
};

// A jump-to-entry combobox: it owns its query, ranks matches with the same
// `filterByName` the index lists use, and navigates to the chosen entry. The
// field itself borrows the shared `listSearch.input` well so a detail plate
// and an index plate wear the same search affordance.
export function SearchCombobox({
  items,
  basePath,
  placeholder,
  ariaLabel,
}: Props) {
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
    router.push(`${basePath}/${slug}/`);
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
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(-1);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label={ariaLabel}
        aria-expanded={showList}
        // The listbox only exists while it is open, so pointing at it the rest
        // of the time leaves a dangling IDREF that resolves to nothing.
        aria-controls={showList ? listboxId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        autoComplete="off"
        spellCheck={false}
      />
      {/* The count is the only cue a screen-reader user gets that typing
          changed the list; the options themselves are never focused. */}
      <span className={styles.status} role="status" aria-live="polite">
        {showList
          ? `${suggestions.length} ${suggestions.length === 1 ? "result" : "results"} available`
          : ""}
      </span>
      {showList && (
        <ul
          className={styles.listbox}
          id={listboxId}
          role="listbox"
          aria-label={`${ariaLabel} results`}
        >
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
              {!!s.detail && (
                <span className={styles.optionDetail}>({s.detail})</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
