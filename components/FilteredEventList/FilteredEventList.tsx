"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { filterByName } from "@/lib/search";
import { searchParser } from "@/lib/listSearchParams";
import listSearch from "@/components/listSearch.module.scss";
import styles from "@/components/FilteredEventList/FilteredEventList.module.scss";

export type EventItem = {
  slug: string;
  name: string;
  typeLabel: string;
  when: string;
  /** Free-text place, or null when the entry only carries map coordinates. */
  location: string | null;
  /** The `when` label carries a trailing asterisk, so the legend has to show. */
  approximate: boolean;
};

type Props = {
  items: EventItem[];
};

export function FilteredEventList({ items }: Props) {
  const [urlSearch, setUrlSearch] = useQueryState("search", searchParser);
  const [userValue, setUserValue] = useState<string | undefined>(undefined);
  const [userDebounced, setUserDebounced] = useState<string | undefined>(
    undefined,
  );

  const value = userValue ?? urlSearch;
  const debounced = userDebounced ?? urlSearch;

  useEffect(() => {
    if (userValue === undefined) return;
    const t = setTimeout(() => setUserDebounced(userValue), 300);
    return () => clearTimeout(t);
  }, [userValue]);

  useEffect(() => {
    if (userDebounced === undefined) return;
    setUrlSearch(userDebounced);
  }, [userDebounced, setUrlSearch]);

  const filtered = filterByName(items, debounced);
  const hasApproximate = filtered.some((item) => item.approximate);

  return (
    <>
      <div className={listSearch.row}>
        <input
          type="search"
          className={listSearch.input}
          placeholder="Search events…"
          value={value}
          onChange={(e) => setUserValue(e.target.value)}
          aria-label="Search events"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {filtered.length === 0 ? (
        <p className={listSearch.empty}>
          No events match &ldquo;{debounced}&rdquo;.
        </p>
      ) : (
        <ul className={styles.list}>
          {filtered.map((item) => (
            <li key={item.slug} className={styles.item}>
              <Link href={`/events/${item.slug}/`} className={styles.link}>
                <span className={styles.name}>{item.name}</span>
                <span className={styles.meta}>
                  {[item.typeLabel, item.location].filter(Boolean).join(" · ")}
                </span>
                <span className={styles.when}>{item.when}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {hasApproximate && (
        <p className={styles.legend}>* approximate or legendary date</p>
      )}
    </>
  );
}
