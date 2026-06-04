"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sigil } from "@/components/Sigil";
import { SortToggle, type SortDirection } from "@/components/SortToggle";
import { ViewToggle, type ViewMode } from "@/components/ViewToggle";
import { filterByName } from "@/lib/search";
import { cx } from "@/lib/cx";
import {
  DIR_PARAM,
  DEFAULT_DIR,
  MIN_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  SEARCH_PARAM,
  SIZE_PARAM,
  getServerSnapshot,
  parseUrlSearch,
  readUrlSearch,
  subscribeToUrlChange,
  writeUrlParam,
} from "@/lib/listUrlState";
import listSearch from "@/components/listSearch.module.scss";
import styles from "@/components/FilteredCharacterList.module.scss";

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

const VIEW_STORAGE_KEY = "gota:characters-view";
const DEFAULT_PAGE_SIZE = 32;

function isViewMode(value: unknown): value is ViewMode {
  return value === "grid" || value === "list";
}

export type CharacterItem = {
  slug: string;
  name: string;
  alias: string | null;
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
  const urlSnapshot = useSyncExternalStore(
    subscribeToUrlChange,
    readUrlSearch,
    getServerSnapshot,
  );
  const urlState = useMemo(
    () => parseUrlSearch(urlSnapshot, pageSize),
    [urlSnapshot, pageSize],
  );

  const [userValue, setUserValue] = useState<string | undefined>(undefined);
  const [userDebounced, setUserDebounced] = useState<string | undefined>(
    undefined,
  );
  const [page, setPage] = useState(1);
  const [lastResetKey, setLastResetKey] = useState("");
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

  const value = userValue ?? urlState.search;
  const debounced = userDebounced ?? urlState.search;
  const dir = urlState.dir;
  const size = urlState.size;

  useEffect(() => {
    if (userValue === undefined) return;
    const t = setTimeout(() => setUserDebounced(userValue), 300);
    return () => clearTimeout(t);
  }, [userValue]);

  useEffect(() => {
    if (userDebounced === undefined) return;
    writeUrlParam({
      name: SEARCH_PARAM,
      value: userDebounced,
      defaultValue: "",
    });
  }, [userDebounced]);

  const resetKey = `${debounced}|${dir}|${size}`;
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setPage(1);
  }

  const sorted = useMemo(() => {
    const arr = [...items].sort((a, b) => a.name.localeCompare(b.name));
    return dir === "desc" ? arr.reverse() : arr;
  }, [items, dir]);

  const filtered = filterByName(sorted, debounced);
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * size;
  const pageItems = filtered.slice(pageStart, pageStart + size);

  const handleSizeChange = (next: number) => {
    writeUrlParam({
      name: SIZE_PARAM,
      value: String(next),
      defaultValue: String(pageSize),
    });
  };

  const handleDirChange = (next: SortDirection) => {
    writeUrlParam({
      name: DIR_PARAM,
      value: next,
      defaultValue: DEFAULT_DIR,
    });
  };

  const renderPagination = (position: "top" | "bottom") => (
    <nav
      className={cx(
        listSearch.pagination,
        position === "top"
          ? listSearch.paginationTop
          : listSearch.paginationBottom,
      )}
      aria-label={`Character list pagination, ${position}`}
    >
      <button
        type="button"
        className={listSearch.button}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
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
          aria-label="Characters per page"
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
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
          placeholder="Search characters…"
          value={value}
          onChange={(e) => setUserValue(e.target.value)}
          aria-label="Search characters"
          autoComplete="off"
          spellCheck={false}
        />
        <SortToggle value={dir} onChange={handleDirChange} />
        <ViewToggle value={view} onChange={handleViewChange} />
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
              const computedAlias = !!item.alias ? `(${item?.alias})` : "";

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
