"use client";

import Link from "next/link";
import { useQueryState } from "nuqs";
import { useDebouncedSearch } from "@/lib/useDebouncedSearch";
import { ListSearchInput } from "@/components/ListSearchInput";
import { Sigil } from "@/components/Sigil";
import { filterByName } from "@/lib/search";
import { searchParser } from "@/lib/listSearchParams";
import listSearch from "@/components/listSearch.module.scss";
import styles from "@/components/FilteredWeaponList/FilteredWeaponList.module.scss";

export type WeaponItem = {
  slug: string;
  name: string;
  houseSlug: string | null;
  region: string | null;
  regionLabel: string | null;
  hasImage: boolean;
};

type Props = {
  items: WeaponItem[];
};

export function FilteredWeaponList({ items }: Props) {
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
          placeholder="Search weapons…"
          ariaLabel="Search weapons"
        />
      </div>
      {filtered.length === 0 ? (
        <p className={listSearch.empty}>
          No weapons match &ldquo;{debounced}&rdquo;.
        </p>
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
                      decorative
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
