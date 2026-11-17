"use client";

import Link from "next/link";
import { ListSearchEmpty, ListSearchInput } from "@/components/ListSearchInput";
import { Sigil } from "@/components/Sigil";
import { cx } from "@/lib/cx";
import { regionColorStyle, type RegionSlug } from "@/lib/regions";
import { useUrlSearchFilter } from "@/lib/useUrlSearchFilter";
import type { Dragon } from "@/lib/schemas";
import listSearch from "@/components/listSearch.module.scss";
import styles from "@/components/FilteredDragonList/FilteredDragonList.module.scss";

export type DragonItem = Pick<Dragon, "slug" | "name"> & {
  houseSlug: string | null;
  region: RegionSlug | null;
};

type Props = {
  items: DragonItem[];
};

export function FilteredDragonList({ items }: Props) {
  const { value, debounced, onChange, filtered } = useUrlSearchFilter({
    items,
  });

  return (
    <>
      <div className={listSearch.row}>
        <ListSearchInput
          value={value}
          onChange={onChange}
          placeholder="Search dragons…"
          ariaLabel="Search dragons"
        />
      </div>
      {filtered.length === 0 ? (
        <ListSearchEmpty noun="dragons" query={debounced} />
      ) : (
        <ul className={styles.list}>
          {filtered.map((item) => (
            <li key={item.slug} className={styles.item}>
              <Link
                href={`/dragons/${item.slug}/`}
                className={cx(styles.card, !item.region && styles.cardWild)}
                style={regionColorStyle({
                  region: item.region,
                  property: "--region-wash",
                })}
              >
                {item.houseSlug ? (
                  <Sigil
                    slug={item.houseSlug}
                    name={item.name}
                    region={item.region}
                    size="6rem"
                    isDecorative
                  />
                ) : (
                  <span className={styles.wildBadge} aria-hidden="true">
                    Wild
                  </span>
                )}
                <span className={styles.name}>{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
