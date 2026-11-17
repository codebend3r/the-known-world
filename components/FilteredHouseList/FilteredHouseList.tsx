"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import { Accordion } from "@/components/Accordion";
import { ListPagination } from "@/components/ListPagination";
import { ListSearchEmpty, ListSearchInput } from "@/components/ListSearchInput";
import { Sigil } from "@/components/Sigil";
import { SortToggle } from "@/components/SortToggle";
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
import type { House, HouseRank } from "@/lib/schemas";
import { cx } from "@/lib/cx";
import { exhaustiveList } from "@/lib/exhaustive-list";
import { groupHousesByRegion, type RegionGroup } from "@/lib/houses";
import { regionColorStyle, type RegionSlug } from "@/lib/regions";
import {
  DEFAULT_PAGE_SIZE,
  MIN_PAGE_SIZE,
  isGrouping,
  paginate,
  type Grouping,
} from "@/lib/listSearchParams";
import { useListQuery } from "@/lib/useListQuery";
import { usePersistedChoice } from "@/lib/usePersistedChoice";
import listSearch from "@/components/listSearch.module.scss";
import styles from "@/components/FilteredHouseList/FilteredHouseList.module.scss";

export type HouseItem = Pick<House, "slug" | "name"> & {
  region: RegionSlug | null;
  regionLabel: string | null;
  isExtinct?: boolean;
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

type RankFilter = "all" | HouseRank;

const RANK_FILTERS = exhaustiveList<RankFilter>()([
  "all",
  "royal",
  "lordly",
  "knightly",
  "other",
  "exiled",
  "extinct",
]);

const RANK_FILTER_LABEL = {
  all: "Any rank",
  royal: "Royal",
  lordly: "Lordly",
  knightly: "Knightly",
  other: "Other",
  exiled: "Exiled",
  extinct: "Extinct",
} as const satisfies Record<RankFilter, string>;

const RANK_OPTIONS = RANK_FILTERS.map((value) => ({
  value,
  label: RANK_FILTER_LABEL[value],
}));

// Rank on a register row is categorical, so it renders as a mono datum rather
// than the select's sentence-case option label.
const RANK_LABEL = {
  royal: "Royal house",
  lordly: "Lordly house",
  knightly: "Knightly house",
  other: "Minor house",
  exiled: "Exiled house",
  extinct: "Extinct line",
} as const satisfies Record<HouseRank, string>;

function isRankFilter(value: string): value is RankFilter {
  return RANK_FILTERS.some((filter) => filter === value);
}

export function FilteredHouseList({
  items,
  pageSize = DEFAULT_PAGE_SIZE,
}: Props) {
  const query = useListQuery({ items, pageSize });
  const [rank, setRank] = useQueryState(
    "rank",
    parseAsStringLiteral(RANK_FILTERS).withDefault("all"),
  );

  const [view, setView] = usePersistedChoice<ViewMode>({
    key: VIEW_STORAGE_KEY,
    fallback: "grid",
    isChoice: isViewMode,
  });
  const [grouping, setGrouping] = usePersistedChoice<Grouping>({
    key: GROUPING_STORAGE_KEY,
    fallback: "flat",
    isChoice: isGrouping,
  });
  const [openRegions, setOpenRegions] = useState<ReadonlySet<string>>(
    new Set(),
  );

  const toggleRegion = (slug: string) => {
    setOpenRegions((prev) => {
      if (prev.has(slug)) {
        return new Set([...prev].filter((open) => open !== slug));
      }
      return new Set([...prev, slug]);
    });
  };

  const facetFiltered = useMemo(
    () =>
      rank === "all"
        ? query.sorted
        : query.sorted.filter((item) => item.rank === rank),
    [query.sorted, rank],
  );
  const regionGroups = useMemo(
    () => groupHousesByRegion({ houses: facetFiltered }),
    [facetFiltered],
  );

  const filtered = filterByName({
    items: facetFiltered,
    query: query.debounced,
  });
  const total = facetFiltered.length;
  const hasQuery = query.debounced.trim().length > 0;
  const noun = total === 1 ? "house" : "houses";
  const isInRegionMode = grouping === "region";
  const countLabel =
    !isInRegionMode && hasQuery
      ? `${filtered.length} of ${total} ${noun}`
      : `${total} ${noun}`;

  const { totalPages, currentPage, pageItems } = paginate({
    items: filtered,
    page: query.page,
    size: query.size,
  });

  const handleRankChange = (next: string) => {
    if (!isRankFilter(next)) return;
    setRank(next === "all" ? null : next);
    query.resetPage();
  };

  const listClass = cx(styles.list, view === "list" && styles.listView);
  const shouldShowPagination = filtered.length > MIN_PAGE_SIZE;
  const pagination = {
    currentPage,
    totalPages,
    size: query.size,
    onPageChange: query.setPage,
    onSizeChange: query.setSize,
    noun: "House",
  };

  return (
    <>
      <div className={styles.controls}>
        {!isInRegionMode && (
          <ListSearchInput
            value={query.value}
            onChange={query.onChange}
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
          <SortToggle value={query.dir} onChange={query.setDir} />
          <ViewToggle options={VIEW_OPTIONS} value={view} onChange={setView} />
          <ViewToggle
            options={GROUP_OPTIONS}
            value={grouping}
            onChange={setGrouping}
            ariaLabel="Grouping"
          />
        </div>
      </div>
      <p className={listSearch.count} aria-live="polite">
        {countLabel}
      </p>
      {isInRegionMode ? (
        <div className={styles.regions}>
          {regionGroups.map((group) => (
            <RegionAccordion
              key={group.slug}
              group={group}
              isOpen={openRegions.has(group.slug)}
              onToggle={() => toggleRegion(group.slug)}
              listClass={listClass}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <ListSearchEmpty noun="houses" query={query.debounced} />
      ) : (
        <>
          {shouldShowPagination && (
            <ListPagination {...pagination} position="top" />
          )}
          <ul className={listClass}>
            {pageItems.map((item, index) => (
              <HouseCard
                key={item.slug}
                item={item}
                priority={index < PRIORITY_COUNT}
              />
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

function HouseCard({ item, priority }: { item: HouseItem; priority: boolean }) {
  const statusClass = cx(
    styles.status,
    item.isExtinct ? styles.statusExtinct : styles.statusExtant,
  );
  return (
    <li className={styles.item}>
      <Link
        href={`/houses/${item.slug}/`}
        className={styles.card}
        style={regionColorStyle({
          region: item.region,
          property: "--card-region",
        })}
      >
        <Sigil
          slug={item.slug}
          name={item.name}
          region={item.region}
          sizes="84px"
          isDecorative
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
              {item.isExtinct ? "Extinct" : "Extant"}
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}

function RegionAccordion({
  group,
  isOpen,
  onToggle,
  listClass,
}: {
  group: RegionGroup<HouseItem>;
  isOpen: boolean;
  onToggle: () => void;
  listClass: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = filterByName({ items: group.items, query });

  return (
    <Accordion
      id={`region-${group.slug}`}
      title={group.label}
      count={group.items.length}
      isOpen={isOpen}
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
        <ListSearchEmpty noun="houses" query={query} />
      ) : (
        <ul className={listClass}>
          {filtered.map((item) => (
            <HouseCard key={item.slug} item={item} priority={false} />
          ))}
        </ul>
      )}
    </Accordion>
  );
}
