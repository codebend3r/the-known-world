import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FamilyTreeChart } from "@/components/FamilyTreeChart";
import type { LaidOutChart, LayoutPerson } from "@/lib/family-tree-layout";

function person(overrides: Partial<LayoutPerson> = {}): LayoutPerson {
  return {
    slug: "p",
    name: "Person",
    alias: null,
    sex: null,
    placeholder: false,
    external: false,
    portrait: null,
    titles: [],
    born: null,
    died: null,
    x: 50,
    y: 50,
    isSpouse: false,
    ...overrides,
  };
}

const EMPTY: LaidOutChart = {
  persons: [],
  spouseEdges: [],
  childEdges: [],
  bounds: { width: 60, height: 60 },
};

describe("FamilyTreeChart — rendering", () => {
  it("renders one circle per person, including spouses", () => {
    const chart: LaidOutChart = {
      ...EMPTY,
      persons: [
        person({ slug: "a", name: "Ann Stark" }),
        person({ slug: "b", name: "Bob Stark", isSpouse: true, x: 100 }),
      ],
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    expect(container.querySelectorAll("circle[data-person]").length).toBe(2);
  });

  it('renders the label as "First L." for two-word names', () => {
    const chart: LaidOutChart = {
      ...EMPTY,
      persons: [person({ slug: "es", name: "Eddard Stark" })],
    };
    render(<FamilyTreeChart chart={chart} />);
    expect(screen.getByText("Eddard S.")).toBeDefined();
  });

  it("renders the label as just the first word for single-word names", () => {
    const chart: LaidOutChart = {
      ...EMPTY,
      persons: [person({ slug: "varys", name: "Varys" })],
    };
    render(<FamilyTreeChart chart={chart} />);
    expect(screen.getByText("Varys")).toBeDefined();
  });

  it("renders a <title> with the full name (and alias if present)", () => {
    const chart: LaidOutChart = {
      ...EMPTY,
      persons: [person({ slug: "es", name: "Eddard Stark", alias: "Ned" })],
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    const titles = Array.from(container.querySelectorAll("title")).map(
      (t) => t.textContent,
    );
    expect(titles).toContain("Eddard Stark (Ned)");
  });

  it("renders an <image> when portrait is non-null and none when null", () => {
    const chart: LaidOutChart = {
      ...EMPTY,
      persons: [
        person({
          slug: "with",
          name: "With Portrait",
          portrait: "/characters/with.png",
        }),
        person({
          slug: "without",
          name: "Without Portrait",
          portrait: null,
          x: 100,
        }),
      ],
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    expect(container.querySelectorAll("image").length).toBe(1);
  });

  it("wraps non-placeholder, non-external persons in <a href> using trailing-slash URL", () => {
    const chart: LaidOutChart = {
      ...EMPTY,
      persons: [person({ slug: "eddard", name: "Eddard Stark" })],
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    const a = container.querySelector("a[href]");
    expect(a?.getAttribute("href")).toBe("/characters/eddard/");
  });

  it("does not wrap placeholders in an anchor", () => {
    const chart: LaidOutChart = {
      ...EMPTY,
      persons: [
        person({ slug: "phantom", name: "Phantom", placeholder: true }),
      ],
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    expect(container.querySelector("a[href]")).toBeNull();
  });

  it("renders the empty-state message when there are no persons", () => {
    render(<FamilyTreeChart chart={EMPTY} />);
    expect(
      screen.getByText(/no members of this house have yet been recorded/i),
    ).toBeDefined();
  });

  it("renders a child connector path per child edge", () => {
    const chart: LaidOutChart = {
      ...EMPTY,
      persons: [
        person({ slug: "p", x: 100, y: 50 }),
        person({ slug: "c", x: 100, y: 150 }),
      ],
      childEdges: [
        { from: { x: 100, y: 64 }, to: { x: 100, y: 136 }, busY: 100 },
      ],
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    expect(container.querySelectorAll("path[data-child-edge]").length).toBe(1);
  });

  it("renders ⚭ glyph and second circle for each spouse edge", () => {
    const chart: LaidOutChart = {
      ...EMPTY,
      persons: [
        person({ slug: "p", name: "Person", x: 50 }),
        person({ slug: "sp", name: "Spouse", isSpouse: true, x: 100 }),
      ],
      spouseEdges: [{ personSlug: "p", spouseSlug: "sp" }],
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    expect(container.querySelectorAll("text[data-cross]").length).toBe(1);
  });
});
