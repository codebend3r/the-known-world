import { describe, it, expect } from "bun:test";
import { render } from "@testing-library/react";
import {
  sectionGlyph,
  sectionGlyphs,
  type SectionSlug,
} from "@/components/SectionGlyphs";

// `it.each` takes a mutable tuple, so this cannot be `readonly`.
const SLUGS: SectionSlug[] = [
  "maps",
  "timeline",
  "houses",
  "characters",
  "weapons",
  "battles",
  "castles",
  "dragons",
  "events",
];

describe("sectionGlyphs", () => {
  it("covers every section the site navigates to", () => {
    expect(Object.keys(sectionGlyphs).sort()).toEqual([...SLUGS].sort());
  });

  it.each(SLUGS)("renders %s as a 32x32 decorative svg", (slug) => {
    const { container } = render(sectionGlyphs[slug]);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 32 32");
    expect(svg?.getAttribute("width")).toBe("32");
    expect(svg?.getAttribute("height")).toBe("32");
    // Decorative by construction: the glyph repeats a label the consumer
    // already renders as text.
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it.each(SLUGS)(
    "draws %s in currentColor so the container tints it",
    (slug) => {
      const { container } = render(sectionGlyphs[slug]);
      const painted = [...container.querySelectorAll("[fill], [stroke]")];
      expect(painted.length).toBeGreaterThan(0);
      // Every painted attribute is either `currentColor` or an explicit `none`;
      // a literal colour here would fight the consuming container's colour.
      const values = painted.flatMap((node) => [
        node.getAttribute("fill"),
        node.getAttribute("stroke"),
      ]);
      expect(
        values.every(
          (value) =>
            value === null || value === "none" || value === "currentColor",
        ),
      ).toBe(true);
    },
  );

  it("draws a distinct mark per section", () => {
    const marks = SLUGS.map((slug) => {
      const { container } = render(sectionGlyphs[slug]);
      return container.innerHTML;
    });
    expect(new Set(marks).size).toBe(SLUGS.length);
  });
});

describe("sectionGlyph", () => {
  it("returns the same node the map holds", () => {
    expect(sectionGlyph("houses")).toBe(sectionGlyphs.houses);
    expect(sectionGlyph("dragons")).toBe(sectionGlyphs.dragons);
  });
});
