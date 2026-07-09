import {
  parseAsInteger,
  parseAsNumberLiteral,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";
import type { SortDirection } from "@/components/SortToggle";

export const SORT_DIRECTIONS = [
  "asc",
  "desc",
] as const satisfies readonly SortDirection[];
export const DEFAULT_DIR: SortDirection = "asc";

export const PAGE_SIZES = [24, 48, 72, 120] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export const PAGE_SIZE_OPTIONS: ReadonlyArray<{
  value: PageSize;
  label: string;
}> = PAGE_SIZES.map((value) => ({ value, label: String(value) }));

export const MIN_PAGE_SIZE: PageSize = 24;
export const DEFAULT_PAGE_SIZE: PageSize = 24;

export function isPageSize(value: number): value is PageSize {
  return PAGE_SIZES.some((size) => size === value);
}

export type Grouping = "flat" | "region";

export function isGrouping(value: unknown): value is Grouping {
  return value === "flat" || value === "region";
}

export const searchParser = parseAsString.withDefault("");

export function listSearchParsers(pageSizeDefault: PageSize) {
  return {
    search: searchParser,
    dir: parseAsStringLiteral(SORT_DIRECTIONS).withDefault(DEFAULT_DIR),
    size: parseAsNumberLiteral(PAGE_SIZES).withDefault(pageSizeDefault),
    page: parseAsInteger.withDefault(1),
  };
}
