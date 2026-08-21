"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useQueryState, useQueryStates, parseAsStringLiteral } from "nuqs";
import { Accordion } from "@/components/Accordion";
import { ListPagination } from "@/components/ListPagination";
import { ListSearchInput } from "@/components/ListSearchInput";
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
import { useDebouncedSearch } from "@/lib/useDebouncedSearch";
import type { HouseRank } from "@/lib/schemas";
import { cx } from "@/lib/cx";
import { compareByName } from "@/lib/collections";
import { REGION_SLUGS, regionLabel } from "@/lib/regions";
import {
  DEFAULT_PAGE_SIZE,
  MIN_PAGE_SIZE,
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
  rank?: HouseRank;
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

type RankFilter =
  | "all"
  | "royal"
  | "lordly"
  | "knightly"
  | "other"
  | "exiled"
  | "extinct";

const RANK_FILTERS = [
  "all",
  "royal",
  "lordly",
  "knightly",
  "other",
  "exiled",
  "extinct",
] as const;

const RANK_OPTIONS: { value: RankFilter; label: string }[] = [
  { value: "all", label: "Any rank" },
  { value: "royal", label: "Royal" },
  { value: "lordly", label: "Lordly" },
  { value: "knightly", label: "Knightly" },
  { value: "other", label: "Other" },
  { value: "exiled", label: "Exiled" },
  { value: "extinct", label: "Extinct" },
];

// Rank on a register row is categorical, so it renders as a mono datum rather
// than the select's sentence-case option label.
const RANK_LABEL: Record<HouseRank, string> = {
  royal: "Royal house",
  lordly: "Lordly house",
  knightly: "Knightly house",
  other: "Minor house",
  exiled: "Exiled house",
  extinct: "Extinct line",
};

function isRankFilter(value: string): value is RankFilter {
  return (RANK_FILTERS as readonly string[]).includes(value);
}

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
  const [rank, setRank] = useQueryState(
    "rank",
    parseAsStringLiteral(RANK_FILTERS).withDefault("all"),
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

  const { value, debounced, onChange } = useDebouncedSearch({
    urlValue: search,
    commit: (next) => setParams({ search: next, page: 1 }),
  });

  const sorted = useMemo(() => {
    const arr = [...items].sort(compareByName);
    return dir === "desc" ? arr.reverse() : arr;
  }, [items, dir]);

  const facetFiltered = useMemo(() => {
    return rank === "all"
      ? sorted
      : sorted.filter((item) => item.rank === rank);
  }, [sorted, rank]);

  const filtered = filterByName(facetFiltered, debounced);
  const total = facetFiltered.length;
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
      items: facetFiltered.filter((item) => item.region === slug),
    })).filter((group) => group.items.length > 0);
    const other = facetFiltered.filter((item) => item.region === null);
    return other.length > 0
      ? [...known, { slug: "other", label: "Other Houses", items: other }]
      : known;
  }, [facetFiltered]);

  const writePage = (next: number) => {
    setParams({ page: next });
  };

  const handleDirChange = (next: SortDirection) => {
    setParams({ dir: next, page: 1 });
  };

  const handleRankChange = (next: string) => {
    if (!isRankFilter(next)) return;
    setRank(next === "all" ? null : next);
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
    const statusClass = cx(
      styles.status,
      item.extinct ? styles.statusExtinct : styles.statusExtant,
    );
    return (
      <li key={item.slug} className={styles.item}>
        <Link href={`/houses/${item.slug}/`} className={cardClass}>
          <Sigil
            slug={item.slug}
            name={item.name}
            region={item.region}
            sizes="84px"
            decorative
            priority={priority}
            className={styles.shield}
          />
          <span className={styles.body}>
            <span className={styles.titleRow}>
              <span className={styles.name}>{item.name}</span>
              {!!item.regionLabel && (
                <span className={styles.region}>{item.regionLabel}</span>
              )}
            </span>
            {!!item.rank && (
              <span className={styles.rank}>{RANK_LABEL[item.rank]}</span>
            )}
            <span className={styles.statusSlot}>
              <span className={statusClass}>
                {item.extinct ? "Extinct" : "Extant"}
              </span>
            </span>
          </span>
        </Link>
      </li>
    );
  };

  const renderPagination = (position: "top" | "bottom") => (
    <ListPagination
      currentPage={currentPage}
      totalPages={totalPages}
      size={size}
      onPageChange={writePage}
      onSizeChange={(next) => setParams({ size: next, page: 1 })}
      position={position}
      noun="House"
    />
  );

  const showPagination = filtered.length > MIN_PAGE_SIZE;

  return (
    <>
      <div className={styles.controls}>
        {!inRegionMode && (
          <ListSearchInput
            value={value}
            onChange={onChange}
            placeholder="Search houses…"
            ariaLabel="Search houses"
            className={styles.searchInput}
          />
        )}
        <div className={styles.toggles}>
          <label className={styles.rankFilter}>
            <span className={styles.rankLabel}>Rank</span>
            <select
              className={cx(listSearch.pageSizeSelect, styles.rankSelect)}
              value={rank}
              onChange={(e) => handleRankChange(e.target.value)}
              aria-label="House rank"
            >
              {RANK_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
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
      <ListSearchInput
        value={query}
        onChange={setQuery}
        placeholder={`Search ${group.label}…`}
        ariaLabel={`Search ${group.label}`}
        className={styles.regionSearch}
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
