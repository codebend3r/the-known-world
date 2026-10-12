import { describe, it, expect } from "bun:test";
import { bySlug, compareByName, firstByKey } from "@/lib/collections";

describe("bySlug", () => {
  it("indexes items by their top-level slug, keyed to their frontmatter", () => {
    const items = [
      { slug: "stark", frontmatter: { name: "House Stark" } },
      { slug: "arryn", frontmatter: { name: "House Arryn" } },
    ];
    const map = bySlug(items);
    expect(map.size).toBe(2);
    expect(map.get("stark")).toEqual({ name: "House Stark" });
    expect(map.get("arryn")).toEqual({ name: "House Arryn" });
  });

  it("preserves the original frontmatter object reference", () => {
    const frontmatter = { name: "House Tully" };
    const map = bySlug([{ slug: "tully", frontmatter }]);
    expect(map.get("tully")).toBe(frontmatter);
  });

  it("returns an empty map for an empty list", () => {
    expect(bySlug([]).size).toBe(0);
  });

  it("keeps the last entry when slugs collide", () => {
    const map = bySlug([
      { slug: "dup", frontmatter: { name: "first" } },
      { slug: "dup", frontmatter: { name: "second" } },
    ]);
    expect(map.get("dup")).toEqual({ name: "second" });
  });
});

describe("firstByKey", () => {
  it("keeps the first item for each key, in first-appearance order", () => {
    const items = [
      { key: "b", n: 1 },
      { key: "a", n: 2 },
      { key: "b", n: 3 },
      { key: "c", n: 4 },
      { key: "a", n: 5 },
    ];
    expect(firstByKey({ items, keyOf: (item) => item.key })).toEqual([
      { key: "b", n: 1 },
      { key: "a", n: 2 },
      { key: "c", n: 4 },
    ]);
  });

  it("returns an empty list for an empty list", () => {
    expect(firstByKey({ items: [], keyOf: String })).toEqual([]);
  });
});

describe("compareByName", () => {
  it("orders two items alphabetically by name", () => {
    expect(compareByName({ name: "Arryn" }, { name: "Stark" })).toBeLessThan(0);
    expect(compareByName({ name: "Stark" }, { name: "Arryn" })).toBeGreaterThan(
      0,
    );
  });

  it("returns 0 for equal names", () => {
    expect(compareByName({ name: "Stark" }, { name: "Stark" })).toBe(0);
  });

  it("sorts an array alphabetically when used as a comparator", () => {
    const sorted = [
      { name: "Stark" },
      { name: "Arryn" },
      { name: "Lannister" },
    ].toSorted(compareByName);
    expect(sorted.map((item) => item.name)).toEqual([
      "Arryn",
      "Lannister",
      "Stark",
    ]);
  });
});
