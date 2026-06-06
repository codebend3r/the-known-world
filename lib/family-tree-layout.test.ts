import { describe, it, expect } from "vitest";
import { layoutFamilyTree, LAYOUT_CONSTANTS } from "@/lib/family-tree-layout";
import type {
  EnrichedTreeNode,
  EnrichedTreeSpouse,
} from "@/lib/family-tree-portraits";

const { DOT_R, H_SPACING, V_SPACING, SPOUSE_GAP, PADDING } = LAYOUT_CONSTANTS;

function spouse(
  overrides: Partial<EnrichedTreeSpouse> = {},
): EnrichedTreeSpouse {
  return {
    slug: null,
    name: "Spouse",
    alias: null,
    sex: null,
    placeholder: false,
    inHouse: false,
    titles: [],
    portrait: null,
    ...overrides,
  };
}

function node(overrides: Partial<EnrichedTreeNode> = {}): EnrichedTreeNode {
  return {
    slug: "p",
    name: "Person",
    alias: null,
    sex: null,
    placeholder: false,
    external: false,
    born: null,
    died: null,
    titles: [],
    portrait: null,
    spouses: [],
    children: [],
    ...overrides,
  };
}

describe("layoutFamilyTree", () => {
  it("places a single root at top-left padding offset", () => {
    const result = layoutFamilyTree([node({ slug: "a" })]);
    const a = result.persons.find((p) => p.slug === "a");
    expect(a).toBeDefined();
    expect(a!.x).toBe(PADDING + DOT_R);
    expect(a!.y).toBe(PADDING + DOT_R);
    expect(result.bounds.width).toBe(PADDING * 2 + DOT_R * 2);
    expect(result.bounds.height).toBe(PADDING * 2 + DOT_R * 2);
  });

  it("places three children evenly under a parent, parent centred", () => {
    const result = layoutFamilyTree([
      node({
        slug: "p",
        children: [
          node({ slug: "c1" }),
          node({ slug: "c2" }),
          node({ slug: "c3" }),
        ],
      }),
    ]);
    const xs = (slug: string) => result.persons.find((p) => p.slug === slug)!.x;
    const [c1, c2, c3] = [xs("c1"), xs("c2"), xs("c3")];
    expect(c2 - c1).toBe(DOT_R * 2 + H_SPACING);
    expect(c3 - c2).toBe(DOT_R * 2 + H_SPACING);
    expect(xs("p")).toBe((c1 + c3) / 2);
    expect(result.persons.find((p) => p.slug === "p")!.y).toBe(PADDING + DOT_R);
    expect(result.persons.find((p) => p.slug === "c1")!.y).toBe(
      PADDING + DOT_R + V_SPACING,
    );
  });

  it("stacks a deep linear lineage by V_SPACING per generation", () => {
    const result = layoutFamilyTree([
      node({
        slug: "g0",
        children: [node({ slug: "g1", children: [node({ slug: "g2" })] })],
      }),
    ]);
    const y = (slug: string) => result.persons.find((p) => p.slug === slug)!.y;
    expect(y("g1") - y("g0")).toBe(V_SPACING);
    expect(y("g2") - y("g1")).toBe(V_SPACING);
  });

  it("treats a spouse pair as a wider unit during sibling packing", () => {
    const result = layoutFamilyTree([
      node({
        slug: "p",
        children: [
          node({
            slug: "c1",
            spouses: [spouse({ slug: "s1", name: "S1", inHouse: false })],
          }),
          node({ slug: "c2" }),
        ],
      }),
    ]);
    const c1 = result.persons.find((p) => p.slug === "c1")!;
    const c2 = result.persons.find((p) => p.slug === "c2")!;
    const s1 = result.persons.find((p) => p.slug === "c1::spouse::0")!;
    expect(s1.x).toBe(c1.x + SPOUSE_GAP + DOT_R * 2);
    expect(c2.x - s1.x).toBe(DOT_R * 2 + H_SPACING);
  });

  it("descends children edges from the spouse-pair midpoint", () => {
    const result = layoutFamilyTree([
      node({
        slug: "p",
        spouses: [spouse({ slug: "ps", name: "PS", inHouse: false })],
        children: [node({ slug: "c" })],
      }),
    ]);
    const p = result.persons.find((x) => x.slug === "p")!;
    const ps = result.persons.find((x) => x.slug === "p::spouse::0")!;
    expect(result.childEdges.length).toBeGreaterThan(0);
    const edge = result.childEdges[0];
    expect(edge.from.x).toBe((p.x + ps.x) / 2);
  });

  it("includes placeholder and external persons in layout (not filtered out)", () => {
    const result = layoutFamilyTree([
      node({
        slug: "p",
        children: [
          node({ slug: "ph", placeholder: true }),
          node({ slug: "ex", external: true }),
        ],
      }),
    ]);
    expect(result.persons.find((p) => p.slug === "ph")).toBeDefined();
    expect(result.persons.find((p) => p.slug === "ex")).toBeDefined();
  });

  it("emits one spouseEdge per person-spouse pair with unique identifiers", () => {
    const result = layoutFamilyTree([
      node({
        slug: "p",
        spouses: [
          spouse({ slug: "s1", name: "S1", inHouse: false }),
          spouse({ slug: "s2", name: "S2", inHouse: false }),
        ],
      }),
    ]);
    expect(result.spouseEdges.length).toBe(2);
    expect(result.spouseEdges.map((e) => e.spouseSlug)).toEqual([
      "p::spouse::0",
      "p::spouse::1",
    ]);
    const spouseSlugs = result.persons
      .filter((p) => p.isSpouse)
      .map((p) => p.slug);
    expect(spouseSlugs).toEqual(["p::spouse::0", "p::spouse::1"]);
  });

  it("sets characterSlug to the spouse's real slug, distinct from the unique layout slug", () => {
    const result = layoutFamilyTree([
      node({
        slug: "elia",
        spouses: [spouse({ slug: "rhaegar", name: "Rhaegar", inHouse: false })],
      }),
    ]);
    const rhaegar = result.persons.find((p) => p.isSpouse);
    expect(rhaegar).toBeDefined();
    expect(rhaegar!.slug).toBe("elia::spouse::0");
    expect(rhaegar!.characterSlug).toBe("rhaegar");
  });

  it("characterSlug is null for placeholder persons", () => {
    const result = layoutFamilyTree([
      node({ slug: "phantom", placeholder: true }),
    ]);
    const phantom = result.persons.find((p) => p.slug === "phantom");
    expect(phantom!.characterSlug).toBeNull();
  });
});
