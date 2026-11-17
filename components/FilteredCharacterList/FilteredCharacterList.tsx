"use client";

import Image from "next/image";
import Link from "next/link";
import { Sigil } from "@/components/Sigil";
import { ListPagination } from "@/components/ListPagination";
import { ListSearchEmpty, ListSearchInput } from "@/components/ListSearchInput";
import { SortToggle } from "@/components/SortToggle";
import {
  ViewToggle,
  GridIcon,
  ListIcon,
  isViewMode,
  type ViewMode,
} from "@/components/ViewToggle";
import { filterByName } from "@/lib/search";
import { cx } from "@/lib/cx";
import { regionColorStyle, type RegionSlug } from "@/lib/regions";
import type { Character } from "@/lib/schemas";
import {
  DEFAULT_PAGE_SIZE,
  MIN_PAGE_SIZE,
  paginate,
} from "@/lib/listSearchParams";
import { useListQuery } from "@/lib/useListQuery";
import { usePersistedChoice } from "@/lib/usePersistedChoice";
import listSearch from "@/components/listSearch.module.scss";
import styles from "@/components/FilteredCharacterList/FilteredCharacterList.module.scss";

const VIEW_OPTIONS = [
  { value: "grid" as const, label: "Grid view", icon: <GridIcon /> },
  { value: "list" as const, label: "List view", icon: <ListIcon /> },
];

const VIEW_STORAGE_KEY = "gota:characters-view";

export type CharacterItem = Pick<Character, "slug" | "name" | "aliases"> & {
  alias: string | null;
  primaryHouseSlug: string | null;
  region: RegionSlug | null;
  portrait: string;
};

type Props = {
  items: CharacterItem[];
  pageSize?: number;
};

export function FilteredCharacterList({
  items,
  pageSize = DEFAULT_PAGE_SIZE,
}: Props) {
  const query = useListQuery({ items, pageSize });
  const [view, setView] = usePersistedChoice<ViewMode>({
    key: VIEW_STORAGE_KEY,
    fallback: "grid",
    isChoice: isViewMode,
  });

  const filtered = filterByName({
    items: query.sorted,
    query: query.debounced,
  });
  const { totalPages, currentPage, pageItems } = paginate({
    items: filtered,
    page: query.page,
    size: query.size,
  });

  const shouldShowPagination = filtered.length > MIN_PAGE_SIZE;
  const pagination = {
    currentPage,
    totalPages,
    size: query.size,
    onPageChange: query.setPage,
    onSizeChange: query.setSize,
    noun: "Character",
  };

  const listClass = cx(styles.list, view === "list" && styles.listView);

  return (
    <>
      <div className={listSearch.rowWithSort}>
        <ListSearchInput
          value={query.value}
          onChange={query.onChange}
          placeholder="Search characters…"
          ariaLabel="Search characters"
        />
        <SortToggle value={query.dir} onChange={query.setDir} />
        <ViewToggle options={VIEW_OPTIONS} value={view} onChange={setView} />
      </div>
      {filtered.length === 0 ? (
        <ListSearchEmpty noun="characters" query={query.debounced} />
      ) : (
        <>
          {shouldShowPagination && (
            <ListPagination {...pagination} position="top" />
          )}
          <ul className={listClass}>
            {pageItems.map((item) => (
              <li key={item.slug} className={styles.item}>
                <Link
                  href={`/characters/${item.slug}/`}
                  className={cx(
                    styles.card,
                    !!item.region && styles.cardRegion,
                  )}
                  style={regionColorStyle({
                    region: item.region,
                    property: "--region-wash",
                  })}
                >
                  <span className={styles.portrait} aria-hidden="true">
                    <Image
                      src={item.portrait}
                      alt=""
                      width={270}
                      height={180}
                      sizes="270px"
                    />
                  </span>
                  <span className={styles.sigil} aria-hidden="true">
                    <Sigil
                      slug={item.primaryHouseSlug}
                      name={item.name}
                      region={item.region}
                      size={view === "list" ? "3.25rem" : "3rem"}
                      isDecorative
                      hasPlate={false}
                    />
                  </span>
                  <span className={styles.name}>{item.name}</span>
                  <span className={styles.alias}>
                    {item.alias ? `(${item.alias})` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {shouldShowPagination && (
            <ListPagination {...pagination} position="bottom" />
          )}
        </>
      )}
    </>
  );
}
