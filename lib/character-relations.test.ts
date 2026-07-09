import { describe, it, expect } from "vitest";
import { resolveRelations } from "@/lib/character-relations";

const charactersBySlug = new Map([
  ["eddard-stark", { name: "Eddard Stark", placeholder: false }],
  ["lyanna-stark", { name: "Lyanna Stark", placeholder: false }],
  ["rickard-stark", { name: "Rickard Stark", placeholder: true }],
]);

describe("resolveRelations", () => {
  it("maps known slugs to linkable refs with the character's name", () => {
    expect(
      resolveRelations({ slugs: ["eddard-stark"], charactersBySlug }),
    ).toEqual([{ slug: "eddard-stark", name: "Eddard Stark", linkable: true }]);
  });

  it("marks placeholder characters as not linkable", () => {
    expect(
      resolveRelations({ slugs: ["rickard-stark"], charactersBySlug }),
    ).toEqual([
      { slug: "rickard-stark", name: "Rickard Stark", linkable: false },
    ]);
  });

  it("falls back to the slug as the name for unknown slugs", () => {
    expect(
      resolveRelations({ slugs: ["a-nameless-one"], charactersBySlug }),
    ).toEqual([
      { slug: "a-nameless-one", name: "a-nameless-one", linkable: false },
    ]);
  });

  it("preserves input order across a mixed list", () => {
    const refs = resolveRelations({
      slugs: ["lyanna-stark", "unknown-slug", "rickard-stark"],
      charactersBySlug,
    });
    expect(refs.map((r) => r.slug)).toEqual([
      "lyanna-stark",
      "unknown-slug",
      "rickard-stark",
    ]);
    expect(refs.map((r) => r.linkable)).toEqual([true, false, false]);
  });

  it("returns an empty array for no slugs", () => {
    expect(resolveRelations({ slugs: [], charactersBySlug })).toEqual([]);
  });
});
