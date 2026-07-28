import { describe, it, expect } from "bun:test";
import { bySlug, compareByName } from "@/lib/collections";

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
    ].sort(compareByName);
    expect(sorted.map((item) => item.name)).toEqual([
      "Arryn",
      "Lannister",
      "Stark",
    ]);
  });
});
