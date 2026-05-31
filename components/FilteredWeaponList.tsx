"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sigil } from "@/components/Sigil";
import { filterByName } from "@/lib/search";
import { cx } from "@/lib/cx";
import listSearch from "@/components/listSearch.module.css";
import styles from "@/components/FilteredWeaponList.module.css";

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
  const [value, setValue] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 300);
    return () => clearTimeout(t);
  }, [value]);

  const filtered = filterByName(items, debounced);

  return (
    <>
      <div className={listSearch.row}>
        <input
          type="search"
          className={listSearch.input}
          placeholder="Search weapons…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
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
                  <Sigil
                    slug={item.houseSlug}
                    name={item.name}
                    region={item.region}
                    size="6rem"
                    decorative
                  />
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
