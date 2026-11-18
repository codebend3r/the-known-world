import { describe, it, expect } from "bun:test";
import {
  PAGE_SIZES,
  PAGE_SIZE_OPTIONS,
  DEFAULT_PAGE_SIZE,
  MIN_PAGE_SIZE,
  isPageSize,
  isGrouping,
  searchParser,
  listSearchParsers,
  paginate,
} from "@/lib/listSearchParams";

describe("isPageSize", () => {
  it("accepts every configured page size", () => {
    expect(PAGE_SIZES.every((size) => isPageSize(size))).toBe(true);
  });

  it("rejects values outside the configured set", () => {
    expect(isPageSize(99)).toBe(false);
    expect(isPageSize(0)).toBe(false);
    expect(isPageSize(31)).toBe(false);
  });
});

describe("PAGE_SIZE_OPTIONS", () => {
  it("pairs each page size with its string label", () => {
    expect(PAGE_SIZE_OPTIONS).toEqual([
      { value: 24, label: "24" },
      { value: 48, label: "48" },
      { value: 72, label: "72" },
      { value: 120, label: "120" },
    ]);
  });

  it("exposes 24 as both the default and the minimum page size", () => {
    expect(DEFAULT_PAGE_SIZE).toBe(24);
    expect(MIN_PAGE_SIZE).toBe(24);
  });
});

describe("searchParser", () => {
  it("defaults to an empty string", () => {
    expect(searchParser.defaultValue).toBe("");
  });
});

describe("listSearchParsers", () => {
  it("builds the search/dir/size/page parser map with the given size default", () => {
    const parsers = listSearchParsers(48);
    expect(Object.keys(parsers).toSorted()).toEqual([
      "dir",
      "page",
      "search",
      "size",
    ]);
    expect(parsers.size.defaultValue).toBe(48);
    expect(parsers.dir.defaultValue).toBe("asc");
    expect(parsers.page.defaultValue).toBe(1);
  });
});

describe("isGrouping", () => {
  it("accepts the two supported groupings", () => {
    expect(isGrouping("flat")).toBe(true);
    expect(isGrouping("region")).toBe(true);
  });

  it("rejects any other value", () => {
    expect(isGrouping("nested")).toBe(false);
    expect(isGrouping("")).toBe(false);
    expect(isGrouping(null)).toBe(false);
    expect(isGrouping(undefined)).toBe(false);
    expect(isGrouping(1)).toBe(false);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 10 }, (_, i) => i);

  it("slices the requested page", () => {
    expect(paginate({ items, page: 2, size: 4 })).toEqual({
      totalPages: 3,
      currentPage: 2,
      pageItems: [4, 5, 6, 7],
    });
  });

  it("clamps a page past the end to the last page", () => {
    const result = paginate({ items, page: 9, size: 4 });
    expect(result.currentPage).toBe(3);
    expect(result.pageItems).toEqual([8, 9]);
  });

  it("clamps a page below one to the first page", () => {
    const result = paginate({ items, page: -2, size: 4 });
    expect(result.currentPage).toBe(1);
    expect(result.pageItems).toEqual([0, 1, 2, 3]);
  });

  it("reports one empty page for an empty list", () => {
    expect(paginate({ items: [], page: 1, size: 4 })).toEqual({
      totalPages: 1,
      currentPage: 1,
      pageItems: [],
    });
  });
});
