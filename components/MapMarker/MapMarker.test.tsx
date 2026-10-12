import { describe, it, expect } from "bun:test";
import { render } from "@testing-library/react";
import { MapMarker } from "@/components/MapMarker";
import type { MapLayer } from "@/lib/map";
import { expectDefined } from "@/test/defined";
import { expectElement } from "@/test/dom";

function renderMarker(props: {
  slug: string;
  name: string;
  type: MapLayer;
  cx?: number;
  cy?: number;
}) {
  const { slug, name, type, cx = 100, cy = 200 } = props;
  return render(
    <svg>
      <MapMarker slug={slug} name={name} type={type} cx={cx} cy={cy} />
    </svg>,
  );
}

describe("MapMarker", () => {
  it("renders an anchor pointing at the trailing-slash castle URL with the name as aria-label", () => {
    const { container } = renderMarker({
      slug: "winterfell",
      name: "Winterfell",
      type: "castle",
    });
    const link = expectElement({
      element: container.querySelector("a"),
      type: Element,
    });
    expect(link.getAttribute("href")).toBe("/castles/winterfell/");
    expect(link.getAttribute("aria-label")).toBe("Winterfell");
    expect(link.getAttribute("tabindex")).toBe("0");
  });

  it("renders the name as the label text offset from the marker centre", () => {
    const { container } = renderMarker({
      slug: "winterfell",
      name: "Winterfell",
      type: "castle",
      cx: 50,
      cy: 60,
    });
    const text = expectElement({
      element: container.querySelector("text"),
      type: SVGTextElement,
    });
    expect(text.textContent).toBe("Winterfell");
    expect(text.getAttribute("x")).toBe("60");
    expect(text.getAttribute("y")).toBe("64");
  });

  it("renders a large gold circle for `castle`", () => {
    const { container } = renderMarker({
      slug: "x",
      name: "X",
      type: "castle",
    });
    const circle = expectElement({
      element: container.querySelector("circle"),
      type: SVGCircleElement,
    });
    expect(circle.getAttribute("r")).toBe("6");
    expect(circle.getAttribute("class")).toContain("castle");
  });

  it("renders a small muted circle for `town`", () => {
    const { container } = renderMarker({ slug: "x", name: "X", type: "town" });
    const circle = expectElement({
      element: container.querySelector("circle"),
      type: SVGCircleElement,
    });
    expect(circle.getAttribute("r")).toBe("4");
    expect(circle.getAttribute("class")).toContain("town");
  });

  it("renders a two-line cross for `ruin`", () => {
    const { container } = renderMarker({ slug: "x", name: "X", type: "ruin" });
    const lines = container.querySelectorAll("line");
    expect(lines).toHaveLength(2);
  });

  it("renders a tower silhouette (two rects) for `watchtower`", () => {
    const { container } = renderMarker({
      slug: "x",
      name: "X",
      type: "watchtower",
    });
    const rects = container.querySelectorAll("rect");
    expect(rects).toHaveLength(2);
  });

  it("renders a filled square for `holdfast`", () => {
    const { container } = renderMarker({
      slug: "x",
      name: "X",
      type: "holdfast",
    });
    const rects = container.querySelectorAll("rect");
    expect(rects).toHaveLength(1);
    expect(rects[0].getAttribute("class")).toContain("holdfast");
  });

  it("renders a triangle linking to the battle page for `battle`", () => {
    const { container } = renderMarker({
      slug: "red-wedding",
      name: "The Red Wedding",
      type: "battle",
      cx: 440,
      cy: 645,
    });
    const link = expectElement({
      element: container.querySelector("a"),
      type: Element,
    });
    expect(link.getAttribute("href")).toBe("/battles/red-wedding/");
    const polygon = expectElement({
      element: container.querySelector("polygon"),
      type: SVGPolygonElement,
    });
    expect(polygon.getAttribute("class")).toContain("battle");
    expect(
      expectDefined(polygon.getAttribute("points")).split(" "),
    ).toHaveLength(3);
  });

  it("renders a diamond linking to the event page for `event`", () => {
    const { container } = renderMarker({
      slug: "the-purple-wedding",
      name: "The Purple Wedding",
      type: "event",
      cx: 590,
      cy: 830,
    });
    const link = expectElement({
      element: container.querySelector("a"),
      type: Element,
    });
    expect(link.getAttribute("href")).toBe("/events/the-purple-wedding/");
    const polygon = expectElement({
      element: container.querySelector("polygon"),
      type: SVGPolygonElement,
    });
    expect(polygon.getAttribute("class")).toContain("event");
    expect(
      expectDefined(polygon.getAttribute("points")).split(" "),
    ).toHaveLength(4);
  });

  it("gives battle and event their own glyph shapes, not a castle circle", () => {
    const battle = renderMarker({ slug: "b", name: "B", type: "battle" });
    expect(battle.container.querySelector("circle")).toBeNull();
    const event = renderMarker({ slug: "e", name: "E", type: "event" });
    expect(event.container.querySelector("circle")).toBeNull();
  });
});
