"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { filterByName } from "@/lib/search";
import { cx } from "@/lib/cx";
import { searchParser } from "@/lib/listSearchParams";
import listSearch from "@/components/listSearch.module.scss";
import styles from "@/components/FilteredWeaponList/FilteredWeaponList.module.scss";

export type WeaponItem = {
  slug: string;
  name: string;
  houseSlug: string | null;
  region: string | null;
  regionLabel: string | null;
};

type Props = {
  items: WeaponItem[];
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

export function FilteredWeaponList({ items }: Props) {
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

  return (
    <>
      <div className={listSearch.row}>
        <input
          type="search"
          className={listSearch.input}
          placeholder="Search weapons…"
          value={value}
          onChange={(e) => setUserValue(e.target.value)}
          aria-label="Search weapons"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {filtered.length === 0 ? (
        <p className={listSearch.empty}>
          No weapons match &ldquo;{debounced}&rdquo;.
        </p>
      ) : (
        <ul className={styles.list}>
          {filtered.map((item) => {
            const regionClass = item.region
              ? REGION_CARD_CLASS[item.region]
              : undefined;
            const cardClass = cx(styles.card, regionClass);
            return (
              <li key={item.slug} className={styles.item}>
                <Link href={`/weapons/${item.slug}/`} className={cardClass}>
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
