import { describe, it, expect } from "bun:test";
import { sigilFile, SIGIL_SLUGS } from "@/lib/sigil";

describe("sigilFile", () => {
  it("returns the slug when it is in SIGIL_SLUGS", () => {
    expect(sigilFile({ slug: "stark" })).toBe("stark");
  });

  it("prefers a registered slug over its region", () => {
    expect(sigilFile({ slug: "stark", region: "north" })).toBe("stark");
  });

  it("resolves a registered slug through SLUG_ALIASES", () => {
    expect(sigilFile({ slug: "durrandon", region: "stormlands" })).toBe(
      "baratheon",
    );
    expect(sigilFile({ slug: "bronn" })).toBe("blackwater");
    expect(sigilFile({ slug: "unknown" })).toBe("unknown-westeros");
  });

  it("falls back to the regional sigil when the slug is unregistered", () => {
    expect(sigilFile({ slug: "not-a-house", region: "north" })).toBe(
      "the-north",
    );
    expect(sigilFile({ slug: "not-a-house", region: "iron-islands" })).toBe(
      "iron-islands",
    );
  });

  it("falls back to unknown-westeros when the slug is unregistered and has no region", () => {
    expect(sigilFile({ slug: "not-a-house" })).toBe("unknown-westeros");
    expect(sigilFile({ slug: "not-a-house", region: null })).toBe(
      "unknown-westeros",
    );
  });

  it("falls back to unknown-westeros when the region is unmapped", () => {
    expect(sigilFile({ slug: "not-a-house", region: "beyond-the-wall" })).toBe(
      "unknown-westeros",
    );
  });

  it("registers the newly added standalone house sigils", () => {
    ["ambrose", "brune-dyre-den", "massey", "charlton"].forEach((slug) => {
      expect(SIGIL_SLUGS.has(slug)).toBe(true);
      expect(sigilFile({ slug, region: "crownlands" })).toBe(slug);
    });
  });
});
