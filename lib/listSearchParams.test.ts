import { describe, it, expect } from "vitest";
import {
  PAGE_SIZES,
  PAGE_SIZE_OPTIONS,
  DEFAULT_PAGE_SIZE,
  MIN_PAGE_SIZE,
  isPageSize,
  searchParser,
  listSearchParsers,
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
    expect(Object.keys(parsers).sort()).toEqual([
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
