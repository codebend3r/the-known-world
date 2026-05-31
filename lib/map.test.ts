import { describe, it, expect } from "vitest";
import { selectVisibleCastles, ALL_CASTLE_TYPES } from "@/lib/map";
import { CastleSchema } from "@/lib/schemas";

function castle(over: Partial<Parameters<typeof CastleSchema.parse>[0]>) {
  return {
    frontmatter: CastleSchema.parse({
      slug: "x",
      name: "X",
      type: "castle",
      coords: { x: 0, y: 0 },
      sources: [],
      ...(over as Record<string, unknown>),
    }),
    body: "",
    slug: (over as { slug?: string }).slug ?? "x",
  };
}

describe("selectVisibleCastles", () => {
  it("drops drafts", () => {
    const all = [castle({ slug: "a" }), castle({ slug: "b", draft: true })];
    const visible = selectVisibleCastles(all, new Set(ALL_CASTLE_TYPES));
    expect(visible.map((c) => c.frontmatter.slug)).toEqual(["a"]);
  });

  it("filters by enabled types", () => {
    const all = [
      castle({ slug: "a", type: "castle" }),
      castle({ slug: "b", type: "town" }),
      castle({ slug: "c", type: "ruin" }),
    ];
    const visible = selectVisibleCastles(all, new Set(["castle", "ruin"]));
    expect(visible.map((c) => c.frontmatter.slug).sort()).toEqual(["a", "c"]);
  });

  it("returns empty when no types enabled", () => {
    const all = [castle({ slug: "a" })];
    const visible = selectVisibleCastles(all, new Set());
    expect(visible).toHaveLength(0);
  });
});

describe("ALL_CASTLE_TYPES", () => {
  it("contains the five enum values", () => {
    expect(ALL_CASTLE_TYPES).toEqual(
      expect.arrayContaining([
        "castle",
        "town",
        "ruin",
        "watchtower",
        "holdfast",
      ]),
    );
    expect(ALL_CASTLE_TYPES).toHaveLength(5);
  });
});
