"use client";

import Link from "next/link";
import { useQueryState } from "nuqs";
import { useDebouncedSearch } from "@/lib/useDebouncedSearch";
import { ListSearchInput } from "@/components/ListSearchInput";
import { Sigil } from "@/components/Sigil";
import { filterByName } from "@/lib/search";
import { cx } from "@/lib/cx";
import { searchParser } from "@/lib/listSearchParams";
import listSearch from "@/components/listSearch.module.scss";
import styles from "@/components/FilteredDragonList/FilteredDragonList.module.scss";

export type DragonItem = {
  slug: string;
  name: string;
  houseSlug: string | null;
  region: string | null;
  regionLabel: string | null;
};

type Props = {
  items: DragonItem[];
};

const REGION_CARD_CLASS: Record<string, string | undefined> = {
  north: styles.cardNorth,
  vale: styles.cardVale,
  riverlands: styles.cardRiverlands,
  westerlands: styles.cardWesterlands,
  reach: styles.cardReach,
  stormlands: styles.cardStormlands,
  dorne: styles.cardDorne,
  "iron-islands": styles.cardIronIslands,
  crownlands: styles.cardCrownlands,
};

export function FilteredDragonList({ items }: Props) {
  const [urlSearch, setUrlSearch] = useQueryState("search", searchParser);
  const { value, debounced, onChange } = useDebouncedSearch({
    urlValue: urlSearch,
    commit: setUrlSearch,
  });

  const filtered = filterByName(items, debounced);

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
        <p className={listSearch.empty}>
          No dragons match &ldquo;{debounced}&rdquo;.
        </p>
      ) : (
        <ul className={styles.list}>
          {filtered.map((item) => {
            const regionClass = item.region
              ? REGION_CARD_CLASS[item.region]
              : styles.cardWild;
            const cardClass = cx(styles.card, regionClass);
            return (
              <li key={item.slug} className={styles.item}>
                <Link href={`/dragons/${item.slug}/`} className={cardClass}>
                  {item.houseSlug ? (
                    <Sigil
                      slug={item.houseSlug}
                      name={item.name}
                      region={item.region}
                      size="6rem"
                      decorative
                    />
                  ) : (
                    <span className={styles.wildBadge} aria-hidden="true">
                      Wild
                    </span>
                  )}
                  <span className={styles.name}>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
