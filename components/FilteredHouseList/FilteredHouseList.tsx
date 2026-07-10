"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useQueryState, useQueryStates, parseAsStringLiteral } from "nuqs";
import { Accordion } from "@/components/Accordion";
import { Sigil } from "@/components/Sigil";
import { SortToggle, type SortDirection } from "@/components/SortToggle";
import {
  ViewToggle,
  GridIcon,
  ListIcon,
  AllHousesIcon,
  RegionGroupIcon,
  isViewMode,
  type ViewMode,
} from "@/components/ViewToggle";
import { filterByName } from "@/lib/search";
import { cx } from "@/lib/cx";
import { compareByName } from "@/lib/collections";
import { REGION_SLUGS, regionLabel } from "@/lib/regions";
import {
  DEFAULT_PAGE_SIZE,
  MIN_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  isPageSize,
  isGrouping,
  listSearchParsers,
  type PageSize,
  type Grouping,
} from "@/lib/listSearchParams";
import listSearch from "@/components/listSearch.module.scss";
import styles from "@/components/FilteredHouseList/FilteredHouseList.module.scss";

export type HouseItem = {
  slug: string;
  name: string;
  region: string | null;
  regionLabel: string | null;
  extinct?: boolean;
};

type Props = {
  items: HouseItem[];
  pageSize?: number;
};

const VIEW_STORAGE_KEY = "gota:houses-view";
const GROUPING_STORAGE_KEY = "gota:houses-grouping";

// Rough first-row count on a wide desktop grid (cards are min 12rem on a
// `--bleed-width` track). Eagerly loading these covers the LCP candidate
// without negating lazy-loading for the rest of the list.
const PRIORITY_COUNT = 8;

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

const GROUP_OPTIONS = [
  { value: "flat" as const, label: "All houses", icon: <AllHousesIcon /> },
  {
    value: "region" as const,
    label: "Group by region",
    icon: <RegionGroupIcon />,
  },
];

type StatusFilter = "all" | "standing" | "extinct";

const STATUS_FILTERS = ["all", "standing", "extinct"] as const;

const STATUS_OPTIONS = [
  { value: "all" as const, label: "Any status", icon: <AllStatusIcon /> },
  {
    value: "standing" as const,
    label: "Standing houses",
    icon: <StandingIcon />,
  },
  { value: "extinct" as const, label: "Extinct houses", icon: <ExtinctIcon /> },
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
  const [status, setStatus] = useQueryState(
    "status",
    parseAsStringLiteral(STATUS_FILTERS).withDefault("all"),
  );

  const [userValue, setUserValue] = useState<string | undefined>(undefined);
  const [userDebounced, setUserDebounced] = useState<string | undefined>(
    undefined,
  );
  const [view, setView] = useState<ViewMode>("grid");
  const [grouping, setGrouping] = useState<Grouping>("flat");
  const [openRegions, setOpenRegions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedView = window.localStorage.getItem(VIEW_STORAGE_KEY);
    const storedGrouping = window.localStorage.getItem(GROUPING_STORAGE_KEY);
    // Hydrating client-only state from `localStorage` is exactly the case
    // an after-mount effect exists for: the server can't read it, and a
    // lazy `useState` initializer would diverge from the server snapshot.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (isViewMode(storedView)) setView(storedView);
    if (isGrouping(storedGrouping)) setGrouping(storedGrouping);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const handleViewChange = (next: ViewMode) => {
    setView(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    }
  };

  const handleGroupingChange = (next: Grouping) => {
    setGrouping(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GROUPING_STORAGE_KEY, next);
    }
  };

  const toggleRegion = (slug: string) => {
    setOpenRegions((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
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
    const arr = [...items].sort(compareByName);
    return dir === "desc" ? arr.reverse() : arr;
  }, [items, dir]);

  const statusFiltered = useMemo(
    () =>
      status === "all"
        ? sorted
        : sorted.filter((item) =>
            status === "extinct" ? !!item.extinct : !item.extinct,
          ),
    [sorted, status],
  );

  const filtered = filterByName(statusFiltered, debounced);
  const total = statusFiltered.length;
  const matching = filtered.length;
  const hasQuery = debounced.trim().length > 0;
  const noun = total === 1 ? "house" : "houses";
  const inRegionMode = grouping === "region";
  const countLabel =
    !inRegionMode && hasQuery
      ? `${matching} of ${total} ${noun}`
      : `${total} ${noun}`;

  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * size;
  const pageItems = filtered.slice(pageStart, pageStart + size);

  const regionGroups = useMemo(() => {
    const known = REGION_SLUGS.map((slug) => ({
      slug,
      label: regionLabel(slug) ?? slug,
      items: statusFiltered.filter((item) => item.region === slug),
    })).filter((group) => group.items.length > 0);
    const other = statusFiltered.filter((item) => item.region === null);
    return other.length > 0
      ? [...known, { slug: "other", label: "Other Houses", items: other }]
      : known;
  }, [statusFiltered]);

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

  const handleStatusChange = (next: StatusFilter) => {
    setStatus(next === "all" ? null : next);
    setParams({ page: 1 });
  };

  const listClass = cx(styles.list, view === "list" && styles.listView);

  const renderCard = ({
    item,
    priority,
  }: {
    item: HouseItem;
    priority: boolean;
  }) => {
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
            priority={priority}
          />
          <span className={styles.name}>{item.name}</span>
          {view === "list" && item.regionLabel && (
            <span className={styles.region}>{item.regionLabel}</span>
          )}
        </Link>
      </li>
    );
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

  return (
    <>
      <div className={styles.controls}>
        {!inRegionMode && (
          <input
            type="search"
            className={cx(listSearch.input, styles.searchInput)}
            placeholder="Search houses…"
            value={value}
            onChange={(e) => setUserValue(e.target.value)}
            aria-label="Search houses"
            autoComplete="off"
            spellCheck={false}
          />
        )}
        <div className={styles.toggles}>
          <ViewToggle
            options={STATUS_OPTIONS}
            value={status}
            onChange={handleStatusChange}
            ariaLabel="House status"
          />
          <SortToggle value={dir} onChange={handleDirChange} />
          <ViewToggle
            options={VIEW_OPTIONS}
            value={view}
            onChange={handleViewChange}
          />
          <ViewToggle
            options={GROUP_OPTIONS}
            value={grouping}
            onChange={handleGroupingChange}
            ariaLabel="Grouping"
          />
        </div>
      </div>
      <p className={listSearch.count} aria-live="polite">
        {countLabel}
      </p>
      {inRegionMode ? (
        <div className={styles.regions}>
          {regionGroups.map((group) => (
            <RegionAccordion
              key={group.slug}
              group={group}
              open={openRegions.has(group.slug)}
              onToggle={() => toggleRegion(group.slug)}
              listClass={listClass}
              renderCard={renderCard}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className={listSearch.empty}>
          No houses match &ldquo;{debounced}&rdquo;.
        </p>
      ) : (
        <>
          {showPagination && renderPagination("top")}
          <ul className={listClass}>
            {pageItems.map((item, index) =>
              renderCard({ item, priority: index < PRIORITY_COUNT }),
            )}
          </ul>
          {showPagination && renderPagination("bottom")}
        </>
      )}
    </>
  );
}

type RegionGroup = {
  slug: string;
  label: string;
  items: HouseItem[];
};

function RegionAccordion({
  group,
  open,
  onToggle,
  listClass,
  renderCard,
}: {
  group: RegionGroup;
  open: boolean;
  onToggle: () => void;
  listClass: string;
  renderCard: (args: { item: HouseItem; priority: boolean }) => ReactNode;
}) {
  const [query, setQuery] = useState("");
  const filtered = filterByName(group.items, query);

  return (
    <Accordion
      id={`region-${group.slug}`}
      title={group.label}
      count={group.items.length}
      open={open}
      onToggle={onToggle}
      headingLevel={2}
    >
      <input
        type="search"
        className={cx(listSearch.input, styles.regionSearch)}
        placeholder={`Search ${group.label}…`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={`Search ${group.label}`}
        autoComplete="off"
        spellCheck={false}
      />
      {filtered.length === 0 ? (
        <p className={listSearch.empty}>
          No houses match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <ul className={listClass}>
          {filtered.map((item) => renderCard({ item, priority: false }))}
        </ul>
      )}
    </Accordion>
  );
}

function AllStatusIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      focusable="false"
    >
      <path
        d="M8 1.5 L13.5 3.5 V8 C13.5 11.3 8 14.5 8 14.5 C8 14.5 2.5 11.3 2.5 8 V3.5 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StandingIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      focusable="false"
    >
      <path
        d="M4 2 V14"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path d="M5 2.5 L13 4.5 L5 6.5 Z" fill="currentColor" />
    </svg>
  );
}

function ExtinctIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      focusable="false"
    >
      <path
        d="M4 2 V14"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M5 2.5 L13 4.5 L5 6.5 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M2 2 L14 14"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
