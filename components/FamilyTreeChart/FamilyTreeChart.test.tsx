import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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
    const { container } = render(<FamilyTreeChart chart={chart} />);
    const labelText = Array.from(container.querySelectorAll("text"))
      .map((t) => t.textContent)
      .find((t) => t === "Varys");
    expect(labelText).toBe("Varys");
  });

  it("renders a <title> with the full name + alias in parentheses", () => {
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

  it("renders a <title> with just the name when there is no alias, including single-word names", () => {
    const chart: LaidOutChart = {
      ...EMPTY,
      persons: [
        person({ slug: "varys", name: "Varys" }),
        person({ slug: "es", name: "Eddard Stark", x: 100 }),
      ],
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    const titles = Array.from(container.querySelectorAll("title")).map(
      (t) => t.textContent,
    );
    expect(titles).toContain("Varys");
    expect(titles).toContain("Eddard Stark");
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

describe("FamilyTreeChart — pan", () => {
  function chartWith(persons: LayoutPerson[]): LaidOutChart {
    return {
      persons,
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
  }

  it("translates the inner <g> when the user drags the SVG", () => {
    const chart = chartWith([person({ slug: "a", x: 100, y: 100 })]);
    const { container } = render(<FamilyTreeChart chart={chart} />);
    const svg = container.querySelector("svg")!;
    const inner = svg.querySelector("g[data-pan-root]") as SVGGElement;
    const before = inner.getAttribute("transform") ?? "";

    fireEvent.pointerDown(svg, { pointerId: 1, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 130, clientY: 90 });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 130, clientY: 90 });

    const after = inner.getAttribute("transform") ?? "";
    expect(after).not.toBe(before);
  });
});

describe("FamilyTreeChart — wheel zoom", () => {
  it("increases scale on negative deltaY", () => {
    const chart: LaidOutChart = {
      persons: [person({ slug: "a", x: 100, y: 100 })],
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    const svg = container.querySelector("svg")!;
    const inner = svg.querySelector("g[data-pan-root]") as SVGGElement;
    const initial = inner.getAttribute("transform") ?? "";
    fireEvent.wheel(svg, {
      deltaY: -500,
      clientX: 200,
      clientY: 150,
    });
    const after = inner.getAttribute("transform") ?? "";
    const matchInitial = initial.match(/scale\(([0-9.]+)\)/);
    const matchAfter = after.match(/scale\(([0-9.]+)\)/);
    expect(parseFloat(matchAfter![1])).toBeGreaterThan(
      parseFloat(matchInitial![1]),
    );
  });
});

describe("FamilyTreeChart — pinch zoom", () => {
  it("scales when two pointers spread apart", () => {
    const chart: LaidOutChart = {
      persons: [person({ slug: "a", x: 100, y: 100 })],
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    const svg = container.querySelector("svg")!;
    const inner = svg.querySelector("g[data-pan-root]") as SVGGElement;

    fireEvent.pointerDown(svg, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerDown(svg, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 200,
      clientY: 100,
    });
    fireEvent.pointerMove(svg, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 50,
      clientY: 100,
    });
    fireEvent.pointerMove(svg, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 250,
      clientY: 100,
    });

    const transform = inner.getAttribute("transform") ?? "";
    const match = transform.match(/scale\(([0-9.]+)\)/);
    expect(parseFloat(match![1])).toBeGreaterThan(1);
  });
});

describe("FamilyTreeChart — control panel", () => {
  it("renders zoom in, zoom out, five presets, and reset buttons", () => {
    const chart: LaidOutChart = {
      persons: [person({ slug: "a", x: 50, y: 50 })],
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
    render(<FamilyTreeChart chart={chart} />);
    expect(screen.getByRole("button", { name: /zoom in/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /zoom out/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /25%/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /50%/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /100%/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /200%/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /400%/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /reset/i })).toBeDefined();
  });

  it("clicking 200% sets the scale on the inner <g> to 4", () => {
    const chart: LaidOutChart = {
      persons: [person({ slug: "a", x: 50, y: 50 })],
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    fireEvent.click(screen.getByRole("button", { name: /200%/ }));
    const inner = container.querySelector("g[data-pan-root]") as SVGGElement;
    const transform = inner.getAttribute("transform") ?? "";
    expect(transform).toMatch(/scale\(4(\.0+)?\)/);
  });

  it("clicking 100% sets scale to 2 and marks the preset as pressed", () => {
    const chart: LaidOutChart = {
      persons: [person({ slug: "a", x: 50, y: 50 })],
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    fireEvent.click(screen.getByRole("button", { name: /200%/ }));
    fireEvent.click(screen.getByRole("button", { name: /100%/ }));
    const inner = container.querySelector("g[data-pan-root]") as SVGGElement;
    expect(inner.getAttribute("transform")).toMatch(/scale\(2(\.0+)?\)/);
    expect(
      screen.getByRole("button", { name: /100%/ }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("clicking + increases scale by the button step factor", () => {
    const chart: LaidOutChart = {
      persons: [person({ slug: "a", x: 50, y: 50 })],
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    fireEvent.click(screen.getByRole("button", { name: /zoom in/i }));
    const inner = container.querySelector("g[data-pan-root]") as SVGGElement;
    const m = inner.getAttribute("transform")!.match(/scale\(([0-9.]+)\)/);
    expect(parseFloat(m![1])).toBeCloseTo(2.5, 2);
  });

  it("clicking reset restores scale to 2 (the new initial) after zooming", () => {
    const chart: LaidOutChart = {
      persons: [person({ slug: "a", x: 50, y: 50 })],
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    fireEvent.click(screen.getByRole("button", { name: /400%/ }));
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    const inner = container.querySelector("g[data-pan-root]") as SVGGElement;
    expect(inner.getAttribute("transform")).toMatch(/scale\(2(\.0+)?\)/);
  });

  it("clicking 400% sets the scale to 8", () => {
    const chart: LaidOutChart = {
      persons: [person({ slug: "a", x: 50, y: 50 })],
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    fireEvent.click(screen.getByRole("button", { name: /400%/ }));
    const inner = container.querySelector("g[data-pan-root]") as SVGGElement;
    const m = inner.getAttribute("transform")!.match(/scale\(([0-9.]+)\)/);
    expect(parseFloat(m![1])).toBe(8);
  });
});

describe("FamilyTreeChart — fullscreen", () => {
  it("renders a fullscreen toggle button labelled 'Open fullscreen' by default", () => {
    const chart: LaidOutChart = {
      persons: [person({ slug: "a", x: 50, y: 50 })],
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
    render(<FamilyTreeChart chart={chart} />);
    expect(
      screen.getByRole("button", { name: /open fullscreen/i }),
    ).toBeDefined();
  });

  it("toggles the container's fullscreen state when clicked", () => {
    const chart: LaidOutChart = {
      persons: [person({ slug: "a", x: 50, y: 50 })],
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    const outer = container.querySelector("[data-fullscreen]");
    expect(outer).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /open fullscreen/i }));
    expect(container.querySelector("[data-fullscreen]")).not.toBeNull();
    expect(
      screen.getByRole("button", { name: /exit fullscreen/i }),
    ).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /exit fullscreen/i }));
    expect(container.querySelector("[data-fullscreen]")).toBeNull();
  });

  it("closes when Escape is pressed while fullscreen", () => {
    const chart: LaidOutChart = {
      persons: [person({ slug: "a", x: 50, y: 50 })],
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    fireEvent.click(screen.getByRole("button", { name: /open fullscreen/i }));
    expect(container.querySelector("[data-fullscreen]")).not.toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(container.querySelector("[data-fullscreen]")).toBeNull();
  });

  it("locks body scroll while fullscreen and restores on exit", () => {
    const chart: LaidOutChart = {
      persons: [person({ slug: "a", x: 50, y: 50 })],
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
    document.body.style.overflow = "";
    render(<FamilyTreeChart chart={chart} />);
    fireEvent.click(screen.getByRole("button", { name: /open fullscreen/i }));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: /exit fullscreen/i }));
    expect(document.body.style.overflow).toBe("");
  });
});
