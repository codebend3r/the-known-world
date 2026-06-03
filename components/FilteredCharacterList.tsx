"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sigil } from "@/components/Sigil";
import { ViewToggle, type ViewMode } from "@/components/ViewToggle";
import { filterByName } from "@/lib/search";
import { cx } from "@/lib/cx";
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

const SEARCH_PARAM = "search";
const VIEW_STORAGE_KEY = "gota:characters-view";

function isViewMode(value: unknown): value is ViewMode {
  return value === "grid" || value === "list";
}

function readSearchParam(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(SEARCH_PARAM) ?? "";
}

function writeSearchParam(value: string) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (value) {
    params.set(SEARCH_PARAM, value);
  } else {
    params.delete(SEARCH_PARAM);
  }
  const query = params.toString();
  const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", next);
}

function subscribeToPopState(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getServerSnapshot() {
  return "";
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

const PAGE_SIZE_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 16, label: "16" },
  { value: 32, label: "32" },
  { value: 64, label: "64" },
  { value: 128, label: "128" },
];

const MIN_PAGE_SIZE = 16;

export function FilteredCharacterList({ items, pageSize = 32 }: Props) {
  const urlSearch = useSyncExternalStore(
    subscribeToPopState,
    readSearchParam,
    getServerSnapshot,
  );
  const [userValue, setUserValue] = useState<string | undefined>(undefined);
  const [userDebounced, setUserDebounced] = useState<string | undefined>(
    undefined,
  );
  const [page, setPage] = useState(1);
  const [lastFilterKey, setLastFilterKey] = useState("");
  const [size, setSize] = useState(pageSize);
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

  const value = userValue ?? urlSearch;
  const debounced = userDebounced ?? urlSearch;

  useEffect(() => {
    if (userValue === undefined) return;
    const t = setTimeout(() => setUserDebounced(userValue), 300);
    return () => clearTimeout(t);
  }, [userValue]);

  useEffect(() => {
    if (userDebounced === undefined) return;
    writeSearchParam(userDebounced);
  }, [userDebounced]);

  if (debounced !== lastFilterKey) {
    setLastFilterKey(debounced);
    setPage(1);
  }

  const filtered = filterByName(items, debounced);
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * size;
  const pageItems = filtered.slice(pageStart, pageStart + size);

  const handleSizeChange = (next: number) => {
    setSize(next);
    setPage(1);
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
      <div className={listSearch.row}>
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
