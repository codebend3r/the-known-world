import { describe, expect, it } from "bun:test";
import { groupHousesByRegion } from "@/lib/houses";
import type { RegionSlug } from "@/lib/regions";

function house(slug: string, region: RegionSlug | null) {
  return { slug, region };
}

describe("groupHousesByRegion", () => {
  it("groups houses in canonical region order and drops empty regions", () => {
    const groups = groupHousesByRegion({
      houses: [
        house("martell", "dorne"),
        house("stark", "north"),
        house("karstark", "north"),
      ],
    });
    expect(groups.map((g) => g.slug)).toEqual(["north", "dorne"]);
    expect(groups[0].label).toBe("The North");
    expect(groups[0].items.map((h) => h.slug)).toEqual(["stark", "karstark"]);
  });

  it("gathers region-less houses last under Other Houses", () => {
    const groups = groupHousesByRegion({
      houses: [house("blackfyre", null), house("tully", "riverlands")],
    });
    expect(groups.map((g) => g.slug)).toEqual(["riverlands", "other"]);
    expect(groups[1]).toEqual({
      slug: "other",
      label: "Other Houses",
      items: [house("blackfyre", null)],
    });
  });

  it("returns no groups for no houses", () => {
    expect(groupHousesByRegion({ houses: [] })).toEqual([]);
  });
});
