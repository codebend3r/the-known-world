"use client";

import Link from "next/link";
import { ListSearchEmpty, ListSearchInput } from "@/components/ListSearchInput";
import { Sigil } from "@/components/Sigil";
import { useUrlSearchFilter } from "@/lib/useUrlSearchFilter";
import type { RegionSlug } from "@/lib/regions";
import type { Weapon } from "@/lib/schemas";
import listSearch from "@/components/listSearch.module.scss";
import styles from "@/components/FilteredWeaponList/FilteredWeaponList.module.scss";

export type WeaponItem = Pick<Weapon, "slug" | "name"> & {
  houseSlug: string | null;
  region: RegionSlug | null;
  hasImage: boolean;
};

type Props = {
  items: WeaponItem[];
};

export function FilteredWeaponList({ items }: Props) {
  const { value, debounced, onChange, filtered } = useUrlSearchFilter({
    items,
  });

  return (
    <>
      <div className={listSearch.row}>
        <ListSearchInput
          value={value}
          onChange={onChange}
          placeholder="Search weapons…"
          ariaLabel="Search weapons"
        />
      </div>
      {filtered.length === 0 ? (
        <ListSearchEmpty noun="weapons" query={debounced} />
      ) : (
        <ul className={styles.list}>
          {filtered.map((item) => (
            <li key={item.slug} className={styles.item}>
              <Link href={`/weapons/${item.slug}/`} className={styles.link}>
                <span className={styles.name}>
                  {item.name}
                  {item.hasImage && (
                    <span
                      className={styles.indicator}
                      title="Illustrated"
                      aria-label="Illustrated"
                    />
                  )}
                </span>
                {!!item.houseSlug && (
                  <span className={styles.sigil} aria-hidden="true">
                    <Sigil
                      slug={item.houseSlug}
                      name={item.name}
                      region={item.region}
                      size="1.5rem"
                      isDecorative
                    />
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
