"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { Sigil } from "@/components/Sigil";
import { CharacterSearchInput } from "@/components/CharacterSearchInput";
import { ListPagination } from "@/components/ListPagination";
import { SortToggle, type SortDirection } from "@/components/SortToggle";
import {
  ViewToggle,
  GridIcon,
  ListIcon,
  isViewMode,
  type ViewMode,
} from "@/components/ViewToggle";
import { filterByName } from "@/lib/search";
import { useDebouncedSearch } from "@/lib/useDebouncedSearch";
import { cx } from "@/lib/cx";
import { compareByName } from "@/lib/collections";
import {
  DEFAULT_PAGE_SIZE,
  MIN_PAGE_SIZE,
  isPageSize,
  listSearchParsers,
  type PageSize,
} from "@/lib/listSearchParams";
import listSearch from "@/components/listSearch.module.scss";
import styles from "@/components/FilteredCharacterList/FilteredCharacterList.module.scss";

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

const VIEW_OPTIONS = [
  { value: "grid" as const, label: "Grid view", icon: <GridIcon /> },
  { value: "list" as const, label: "List view", icon: <ListIcon /> },
];

const VIEW_STORAGE_KEY = "gota:characters-view";

export type CharacterItem = {
  slug: string;
  name: string;
  alias: string | null;
  aliases: string[];
  primaryHouseSlug: string | null;
  region: string | null;
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
  const sizeDefault: PageSize = isPageSize(pageSize)
    ? pageSize
    : DEFAULT_PAGE_SIZE;
  const parsers = useMemo(() => listSearchParsers(sizeDefault), [sizeDefault]);
  const [{ search, dir, size, page: rawPage }, setParams] =
    useQueryStates(parsers);
  const page = Math.max(1, rawPage);

  const [view, setView] = useState<ViewMode>("grid");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    // Hydrating client-only state from `localStorage` is exactly the case
    // an after-mount effect exists for: the server can't read it, and a
    // lazy `useState` initializer would diverge from the server snapshot.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isViewMode(stored)) setView(stored);
  }, []);

  const handleViewChange = (next: ViewMode) => {
    setView(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    }
  };

  const { value, debounced, onChange } = useDebouncedSearch({
    urlValue: search,
    commit: (next) => setParams({ search: next, page: 1 }),
  });

  const sorted = useMemo(() => {
    const arr = [...items].sort(compareByName);
    return dir === "desc" ? arr.reverse() : arr;
  }, [items, dir]);

  const filtered = filterByName(sorted, debounced);
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * size;
  const pageItems = filtered.slice(pageStart, pageStart + size);

  const writePage = (next: number) => {
    setParams({ page: next });
  };

  const handleDirChange = (next: SortDirection) => {
    setParams({ dir: next, page: 1 });
  };

  const renderPagination = (position: "top" | "bottom") => (
    <ListPagination
      currentPage={currentPage}
      totalPages={totalPages}
      size={size}
      onPageChange={writePage}
      onSizeChange={(next) => setParams({ size: next, page: 1 })}
      position={position}
      noun="Character"
    />
  );

  const showPagination = filtered.length > MIN_PAGE_SIZE;

  const listClass = cx(styles.list, view === "list" && styles.listView);

  return (
    <>
      <div className={listSearch.rowWithSort}>
        <CharacterSearchInput value={value} onChange={onChange} />
        <SortToggle value={dir} onChange={handleDirChange} />
        <ViewToggle
          options={VIEW_OPTIONS}
          value={view}
          onChange={handleViewChange}
        />
      </div>
      {filtered.length === 0 ? (
        <p className={listSearch.empty}>
          No characters match &ldquo;{debounced}&rdquo;.
        </p>
      ) : (
        <>
          {showPagination && renderPagination("top")}
          <ul className={listClass}>
            {pageItems.map((item) => {
              const regionClass = item.region
                ? REGION_CARD_CLASS[item.region]
                : undefined;
              const cardClass = cx(styles.card, regionClass);
              const computedAlias = item.alias ? `(${item.alias})` : "";

              return (
                <li key={item.slug} className={styles.item}>
                  <Link
                    href={`/characters/${item.slug}/`}
                    className={cardClass}
                    {...(item.region ? { "data-region": item.region } : {})}
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
                        decorative
                        hasPlate={false}
                      />
                    </span>
                    <span className={styles.name}>{item.name}</span>
                    <span className={styles.alias}>{computedAlias}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {showPagination && renderPagination("bottom")}
        </>
      )}
    </>
  );
}
