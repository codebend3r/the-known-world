import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimelineChart } from "@/components/TimelineChart";
import { buildTimeline } from "@/lib/timeline";
import type { Battle } from "@/lib/schemas";

const makeBattle = ({
  slug,
  year,
  era = "AC",
  region,
  precision = "exact",
}: {
  slug: string;
  year: number;
  era?: Battle["start"]["era"];
  region?: Battle["region"];
  precision?: Battle["start"]["precision"];
}): Battle => ({
  slug,
  name: slug,
  type: "battle",
  start: { year, era, precision },
  end: { year, era, precision },
  region,
  participants: [],
  commanders: [],
  casualties: [],
  aliases: [],
  mentions: [],
  sources: [],
  draft: false,
});

const model = buildTimeline({
  battles: [
    makeBattle({
      slug: "old-war",
      year: 12000,
      era: "BC",
      precision: "legendary",
    }),
    makeBattle({ slug: "field-of-fire", year: 2, era: "BC", region: "reach" }),
    makeBattle({ slug: "sack-of-astapor", year: 299 }),
    makeBattle({ slug: "a", year: 299, region: "north" }),
    makeBattle({ slug: "b", year: 299, region: "north" }),
    makeBattle({ slug: "c", year: 300, region: "north" }),
  ],
});

describe("TimelineChart", () => {
  it("renders the landmass headings in order", () => {
    render(<TimelineChart model={model} />);
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual([
      "Westeros",
      "Essos",
      "Summer Isles",
    ]);
  });

  it("links single events to their battle pages", () => {
    render(<TimelineChart model={model} />);
    const link = screen.getByRole("link", { name: /field-of-fire/i });
    expect(link.getAttribute("href")).toBe("/battles/field-of-fire/");
  });

  it("renders a cluster pill for near-simultaneous events", () => {
    render(<TimelineChart model={model} />);
    expect(screen.getByRole("button", { name: /3 events/i })).toBeDefined();
  });

  it("renders axis ticks and era bands", () => {
    render(<TimelineChart model={model} />);
    expect(screen.getByText("Aegon's Conquest")).toBeDefined();
    expect(screen.getByText("12000 BC")).toBeDefined();
    expect(screen.getByText("The Age of Heroes")).toBeDefined();
  });

  it("places the Essos battle in the Essos column", () => {
    render(<TimelineChart model={model} />);
    const essos = screen.getByRole("region", { name: "Essos" });
    const link = screen.getByRole("link", { name: /sack-of-astapor/i });
    expect(essos.contains(link)).toBe(true);
  });
});
