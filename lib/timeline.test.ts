import { describe, it, expect } from "vitest";
import type { Battle, Event } from "@/lib/schemas";
import {
  CLUSTER_GAP_PX,
  LANDMASSES,
  PX_PER_YEAR,
  buildTimeline,
  landmassForBattle,
} from "@/lib/timeline";

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

const makeEvent = ({
  slug,
  year,
  era = "AC",
  landmass = "westeros",
  type = "other",
  precision = "exact",
}: {
  slug: string;
  year: number;
  era?: Event["date"]["era"];
  landmass?: Event["landmass"];
  type?: Event["type"];
  precision?: Event["date"]["precision"];
}): Event => ({
  slug,
  name: slug,
  type,
  date: { year, era, precision },
  location: slug,
  landmass,
  participants: [],
  casualties: [],
  sources: [],
  draft: false,
});

describe("landmassForBattle", () => {
  it("maps any battle with a region to westeros", () => {
    const battle = makeBattle({
      slug: "field-of-fire",
      year: 2,
      era: "BC",
      region: "reach",
    });
    expect(landmassForBattle({ battle })).toBe("westeros");
  });

  it("maps the Essosi battles to essos", () => {
    const essosSlugs = [
      "century-of-blood",
      "ghiscari-wars",
      "rhoynish-wars",
      "sack-of-astapor",
      "taking-of-yunkai",
      "sack-of-meereen",
      "battle-of-meereen",
      "war-of-the-ninepenny-kings",
    ];
    const landmasses = essosSlugs.map((slug) =>
      landmassForBattle({ battle: makeBattle({ slug, year: 259 }) }),
    );
    expect(landmasses).toEqual(essosSlugs.map(() => "essos"));
  });

  it("maps region-less Wall battles to westeros", () => {
    const battle = makeBattle({ slug: "battle-beneath-the-wall", year: 300 });
    expect(landmassForBattle({ battle })).toBe("westeros");
  });
});

describe("buildTimeline", () => {
  it("spaces events proportionally to the years between them", () => {
    const model = buildTimeline({
      battles: [
        makeBattle({ slug: "a", year: 100, region: "north" }),
        makeBattle({ slug: "b", year: 200, region: "north" }),
        makeBattle({ slug: "c", year: 400, region: "north" }),
      ],
    });
    const ys = model.columns.westeros.map((node) => node.y);
    expect(ys[1] - ys[0]).toBe(100 * PX_PER_YEAR);
    expect(ys[2] - ys[1]).toBe(200 * PX_PER_YEAR);
  });

  it("clusters events within the gap window and labels the count", () => {
    const model = buildTimeline({
      battles: [
        makeBattle({ slug: "far", year: 100, region: "north" }),
        makeBattle({ slug: "a", year: 299, region: "north" }),
        makeBattle({ slug: "b", year: 299, region: "north" }),
        makeBattle({ slug: "c", year: 300, region: "north" }),
        makeBattle({ slug: "d", year: 300, region: "north" }),
      ],
    });
    const nodes = model.columns.westeros;
    expect(nodes).toHaveLength(2);
    expect(nodes[0].kind).toBe("single");
    const cluster = nodes[1];
    expect(cluster.kind).toBe("cluster");
    if (cluster.kind === "cluster") {
      expect(cluster.label).toBe("4 events");
      expect(cluster.when).toBe("299–300 AC");
      expect(cluster.events.map((e) => e.slug)).toEqual(["a", "b", "c", "d"]);
    }
  });

  it("breaks a chain once a cluster spans more than the year cap", () => {
    const model = buildTimeline({
      battles: [
        makeBattle({ slug: "a", year: 282, region: "north" }),
        makeBattle({ slug: "b", year: 289, region: "north" }),
        makeBattle({ slug: "c", year: 298, region: "north" }),
        makeBattle({ slug: "d", year: 299, region: "north" }),
        makeBattle({ slug: "e", year: 300, region: "north" }),
      ],
    });
    const nodes = model.columns.westeros;
    expect(nodes.map((n) => n.kind)).toEqual(["cluster", "cluster"]);
    const [first, second] = nodes;
    if (first.kind === "cluster" && second.kind === "cluster") {
      expect(first.events.map((e) => e.slug)).toEqual(["a", "b"]);
      expect(second.events.map((e) => e.slug)).toEqual(["c", "d", "e"]);
      expect(second.when).toBe("298–300 AC");
    }
  });

  it("keeps events farther apart than the gap window separate", () => {
    const gapYears = CLUSTER_GAP_PX / PX_PER_YEAR + 1;
    const model = buildTimeline({
      battles: [
        makeBattle({ slug: "a", year: 100, region: "north" }),
        makeBattle({ slug: "b", year: 100 + gapYears, region: "north" }),
      ],
    });
    expect(model.columns.westeros.map((n) => n.kind)).toEqual([
      "single",
      "single",
    ]);
  });

  it("returns an empty summer-isles column when no battles map there", () => {
    const model = buildTimeline({
      battles: [makeBattle({ slug: "a", year: 100, region: "north" })],
    });
    expect(model.columns["summer-isles"]).toEqual([]);
    expect(LANDMASSES).toEqual(["westeros", "essos", "summer-isles"]);
  });

  it("links each event to its battle page with a formatted date", () => {
    const model = buildTimeline({
      battles: [
        makeBattle({
          slug: "field-of-fire",
          year: 2,
          era: "BC",
          region: "reach",
        }),
      ],
    });
    const node = model.columns.westeros[0];
    expect(node.kind).toBe("single");
    if (node.kind === "single") {
      expect(node.event.href).toBe("/battles/field-of-fire/");
      expect(node.event.when).toBe("2 BC");
    }
  });

  it("includes BC millennium ticks, the Aegon's Conquest line, and AC half-centuries", () => {
    const model = buildTimeline({
      battles: [
        makeBattle({
          slug: "old",
          year: 12000,
          era: "BC",
          precision: "legendary",
        }),
        makeBattle({ slug: "new", year: 300, region: "north" }),
      ],
    });
    const labels = model.ticks.map((t) => t.label);
    expect(labels).toContain("12000 BC");
    expect(labels).toContain("1000 BC");
    expect(labels).toContain("Aegon's Conquest");
    expect(labels).toContain("300 AC");
    const sortedYs = [...model.ticks].sort((a, b) => a.y - b.y).map((t) => t.y);
    expect(model.ticks.map((t) => t.y)).toEqual(sortedYs);
    expect(sortedYs.every((y) => y >= 0 && y <= model.height)).toBe(true);
  });

  it("emits era bands across the ancient stretch", () => {
    const model = buildTimeline({
      battles: [
        makeBattle({
          slug: "old",
          year: 12000,
          era: "BC",
          precision: "legendary",
        }),
        makeBattle({ slug: "new", year: 300, region: "north" }),
      ],
    });
    const labels = model.eras.map((e) => e.label);
    expect(labels).toContain("The Dawn Age");
    expect(labels).toContain("The Age of Heroes");
    expect(labels).toContain("The Long Night");
    expect(labels).toContain("The Andal Invasion");
    const dawnAge = model.eras.find((e) => e.label === "The Dawn Age");
    expect(dawnAge?.height ?? 0).toBe(2000 * PX_PER_YEAR);
  });

  it("returns an empty model for no battles", () => {
    const model = buildTimeline({ battles: [] });
    expect(model.height).toBe(0);
    expect(model.ticks).toEqual([]);
    expect(model.columns.westeros).toEqual([]);
  });

  it("places events in their landmass columns with event hrefs", () => {
    const model = buildTimeline({
      battles: [],
      events: [
        makeEvent({ slug: "the-purple-wedding", year: 300, type: "wedding" }),
        makeEvent({
          slug: "doom-of-valyria",
          year: 114,
          era: "BC",
          landmass: "essos",
          type: "disaster",
        }),
        makeEvent({
          slug: "drowning-of-the-summer-isles",
          year: 10000,
          era: "BC",
          landmass: "summer-isles",
          type: "disaster",
          precision: "legendary",
        }),
      ],
    });
    const westeros = model.columns.westeros[0];
    expect(westeros.kind).toBe("single");
    if (westeros.kind === "single") {
      expect(westeros.event.href).toBe("/events/the-purple-wedding/");
      expect(westeros.event.when).toBe("300 AC");
    }
    expect(model.columns.essos).toHaveLength(1);
    expect(model.columns["summer-isles"]).toHaveLength(1);
  });

  it("computes the year range from battles and events together", () => {
    const model = buildTimeline({
      battles: [makeBattle({ slug: "recent", year: 300, region: "north" })],
      events: [
        makeEvent({
          slug: "ancient",
          year: 2000,
          era: "BC",
          precision: "era",
        }),
      ],
    });
    const labels = model.ticks.map((t) => t.label);
    expect(labels).toContain("2000 BC");
    expect(labels).toContain("300 AC");
  });

  it("clusters battles and events together within a column", () => {
    const model = buildTimeline({
      battles: [
        makeBattle({ slug: "a-battle", year: 299, region: "north" }),
        makeBattle({ slug: "b-battle", year: 299, region: "north" }),
      ],
      events: [makeEvent({ slug: "an-event", year: 300 })],
    });
    const nodes = model.columns.westeros;
    expect(nodes).toHaveLength(1);
    const cluster = nodes[0];
    expect(cluster.kind).toBe("cluster");
    if (cluster.kind === "cluster") {
      expect(cluster.label).toBe("3 events");
      expect(cluster.events.map((e) => e.slug)).toEqual([
        "a-battle",
        "b-battle",
        "an-event",
      ]);
    }
  });
});
