"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { Sigil } from "@/components/Sigil";
import { SortToggle, type SortDirection } from "@/components/SortToggle";
import {
  ViewToggle,
  GridIcon,
  ListIcon,
  type ViewMode,
} from "@/components/ViewToggle";
import { filterByName } from "@/lib/search";
import { cx } from "@/lib/cx";
import {
  DEFAULT_PAGE_SIZE,
  MIN_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  isPageSize,
  listSearchParsers,
  type PageSize,
} from "@/lib/listSearchParams";
import listSearch from "@/components/listSearch.module.scss";
import styles from "@/components/FilteredHouseList/FilteredHouseList.module.scss";

export type HouseItem = {
  slug: string;
  name: string;
  region: string | null;
  regionLabel: string | null;
};

type Props = {
  items: HouseItem[];
  pageSize?: number;
};

const VIEW_STORAGE_KEY = "gota:houses-view";

// Rough first-row count on a wide desktop grid (cards are min 12rem on a
// `--bleed-width` track). Eagerly loading these covers the LCP candidate
// without negating lazy-loading for the rest of the list.
const PRIORITY_COUNT = 8;

function isViewMode(value: unknown): value is ViewMode {
  return value === "grid" || value === "list";
}

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

export function FilteredHouseList({
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

  const [userValue, setUserValue] = useState<string | undefined>(undefined);
  const [userDebounced, setUserDebounced] = useState<string | undefined>(
    undefined,
  );
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

  const value = userValue ?? search;
  const debounced = userDebounced ?? search;

  useEffect(() => {
    if (userValue === undefined) return;
    const t = setTimeout(() => setUserDebounced(userValue), 300);
    return () => clearTimeout(t);
  }, [userValue]);

  useEffect(() => {
    if (userDebounced === undefined) return;
    setParams({ search: userDebounced, page: 1 });
  }, [userDebounced, setParams]);

  const sorted = useMemo(() => {
    const arr = [...items].sort((a, b) => a.name.localeCompare(b.name));
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

  const handleSizeChange = (next: number) => {
    if (!isPageSize(next)) return;
    setParams({ size: next, page: 1 });
  };

  const handleDirChange = (next: SortDirection) => {
    setParams({ dir: next, page: 1 });
  };

  const renderPagination = (position: "top" | "bottom") => (
    <nav
      className={cx(
        listSearch.pagination,
        position === "top"
          ? listSearch.paginationTop
          : listSearch.paginationBottom,
      )}
      aria-label={`House list pagination, ${position}`}
    >
      <button
        type="button"
        className={listSearch.button}
        onClick={() => writePage(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        ← Prev
      </button>
      <span
        className={listSearch.status}
        {...(position === "bottom" ? { "aria-live": "polite" as const } : {})}
      >
        Page {currentPage} of {totalPages}
      </span>
      <label className={listSearch.pageSize}>
        Show{" "}
        <select
          className={listSearch.pageSizeSelect}
          value={String(size)}
          onChange={(e) => handleSizeChange(Number(e.target.value))}
          aria-label="Houses per page"
        >
          {PAGE_SIZE_OPTIONS.map((opt) => (
            <option key={opt.label} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>{" "}
        per page
      </label>
      <button
        type="button"
        className={listSearch.button}
        onClick={() => writePage(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        Next →
      </button>
    </nav>
  );

  const showPagination = filtered.length > MIN_PAGE_SIZE;

  const listClass = cx(styles.list, view === "list" && styles.listView);

  return (
    <>
      <div className={listSearch.rowWithSort}>
        <input
          type="search"
          className={listSearch.input}
          placeholder="Search houses…"
          value={value}
          onChange={(e) => setUserValue(e.target.value)}
          aria-label="Search houses"
          autoComplete="off"
          spellCheck={false}
        />
        <SortToggle value={dir} onChange={handleDirChange} />
        <ViewToggle
          options={VIEW_OPTIONS}
          value={view}
          onChange={handleViewChange}
        />
      </div>
      {filtered.length === 0 ? (
        <p className={listSearch.empty}>
          No houses match &ldquo;{debounced}&rdquo;.
        </p>
      ) : (
        <>
          {showPagination && renderPagination("top")}
          <ul className={listClass}>
            {pageItems.map((item, index) => {
              const regionClass = item.region
                ? REGION_CARD_CLASS[item.region]
                : undefined;
              const cardClass = cx(styles.card, regionClass);
              return (
                <li key={item.slug} className={styles.item}>
                  <Link href={`/houses/${item.slug}/`} className={cardClass}>
                    <Sigil
                      slug={item.slug}
                      name={item.name}
                      region={item.region}
                      size={view === "list" ? "4rem" : "6rem"}
                      decorative
                      priority={index < PRIORITY_COUNT}
                    />
                    <span className={styles.name}>{item.name}</span>
                    {view === "list" && item.regionLabel && (
                      <span className={styles.region}>{item.regionLabel}</span>
                    )}
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
