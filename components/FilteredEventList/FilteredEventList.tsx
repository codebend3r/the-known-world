"use client";

import Link from "next/link";
import { ListSearchEmpty, ListSearchInput } from "@/components/ListSearchInput";
import { useUrlSearchFilter } from "@/lib/useUrlSearchFilter";
import type { Event } from "@/lib/schemas";
import listSearch from "@/components/listSearch.module.scss";
import styles from "@/components/FilteredEventList/FilteredEventList.module.scss";

export type EventItem = Pick<Event, "slug" | "name"> & {
  typeLabel: string;
  when: string;
  /** Free-text place, or null when the entry only carries map coordinates. */
  location: string | null;
  /** The `when` label carries a trailing asterisk, so the legend has to show. */
  isApproximate: boolean;
};

type Props = {
  items: EventItem[];
};

export function FilteredEventList({ items }: Props) {
  const { value, debounced, onChange, filtered } = useUrlSearchFilter({
    items,
  });
  const hasApproximate = filtered.some((item) => item.isApproximate);

  return (
    <>
      <div className={listSearch.row}>
        <ListSearchInput
          value={value}
          onChange={onChange}
          placeholder="Search events…"
          ariaLabel="Search events"
        />
      </div>
      {filtered.length === 0 ? (
        <ListSearchEmpty noun="events" query={debounced} />
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
