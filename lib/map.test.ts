import { describe, it, expect } from "bun:test";
import {
  ALL_CASTLE_TYPES,
  MAP_BOUNDS,
  MAP_LAYERS,
  entryCoords,
  isCoords,
  isWithinMapBounds,
  placementHref,
  selectPlacements,
  selectVisibleCastles,
  type MapLayer,
} from "@/lib/map";
import { BattleSchema, CastleSchema, EventSchema } from "@/lib/schemas";

function castle(over: Record<string, unknown>) {
  const slug = typeof over.slug === "string" ? over.slug : "x";
  return {
    frontmatter: CastleSchema.parse({
      slug,
      name: "X",
      type: "castle",
      coords: { x: 0, y: 0 },
      sources: [],
      ...over,
    }),
    body: "",
    slug,
  };
}

function battle(over: Record<string, unknown>) {
  const slug = typeof over.slug === "string" ? over.slug : "b";
  const date = { year: 300, era: "AC", precision: "exact" };
  return {
    frontmatter: BattleSchema.parse({
      slug,
      name: "B",
      type: "battle",
      start: date,
      end: date,
      ...over,
    }),
    body: "",
    slug,
  };
}

function event(over: Record<string, unknown>) {
  const slug = typeof over.slug === "string" ? over.slug : "e";
  return {
    frontmatter: EventSchema.parse({
      slug,
      name: "E",
      type: "wedding",
      date: { year: 300, era: "AC", precision: "exact" },
      location: "somewhere",
      landmass: "westeros",
      ...over,
    }),
    body: "",
    slug,
  };
}

const ALL_LAYERS: ReadonlySet<MapLayer> = new Set(MAP_LAYERS);

describe("selectVisibleCastles", () => {
  it("drops drafts", () => {
    const castles = [castle({ slug: "a" }), castle({ slug: "b", draft: true })];
    const visible = selectVisibleCastles({ castles, layers: ALL_LAYERS });
    expect(visible.map((entry) => entry.frontmatter.slug)).toEqual(["a"]);
  });

  it("filters by enabled layers", () => {
    const castles = [
      castle({ slug: "a", type: "castle" }),
      castle({ slug: "b", type: "town" }),
      castle({ slug: "c", type: "ruin" }),
    ];
    const visible = selectVisibleCastles({
      castles,
      layers: new Set<MapLayer>(["castle", "ruin"]),
    });
    expect(visible.map((entry) => entry.frontmatter.slug).sort()).toEqual([
      "a",
      "c",
    ]);
  });

  it("returns empty when no layers enabled", () => {
    const visible = selectVisibleCastles({
      castles: [castle({ slug: "a" })],
      layers: new Set<MapLayer>(),
    });
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

describe("MAP_LAYERS", () => {
  it("is the five castle types plus battle and event", () => {
    expect([...MAP_LAYERS]).toEqual([...ALL_CASTLE_TYPES, "battle", "event"]);
  });
});

describe("isCoords", () => {
  it("accepts a numeric x/y pair", () => {
    expect(isCoords({ x: 1, y: 2 })).toBe(true);
  });

  it("rejects strings, null, and partial pairs", () => {
    expect(isCoords("King's Landing")).toBe(false);
    expect(isCoords(null)).toBe(false);
    expect(isCoords({ x: 1 })).toBe(false);
    expect(isCoords({ x: "1", y: "2" })).toBe(false);
  });
});

describe("entryCoords", () => {
  it("prefers the explicit `coords` field", () => {
    expect(
      entryCoords({ coords: { x: 5, y: 6 }, location: { x: 1, y: 2 } }),
    ).toEqual({ x: 5, y: 6 });
  });

  it("falls back to a coords-shaped `location` union", () => {
    expect(entryCoords({ location: { x: 1, y: 2 } })).toEqual({ x: 1, y: 2 });
  });

  it("returns null for a free-text location", () => {
    expect(entryCoords({ location: "the Twins" })).toBeNull();
    expect(entryCoords({})).toBeNull();
  });
});

describe("isWithinMapBounds", () => {
  it("accepts the corners of the atlas box", () => {
    expect(isWithinMapBounds({ x: 0, y: 0 })).toBe(true);
    expect(
      isWithinMapBounds({ x: MAP_BOUNDS.width, y: MAP_BOUNDS.height }),
    ).toBe(true);
  });

  it("rejects negatives and anything past the far edge", () => {
    expect(isWithinMapBounds({ x: -1, y: 10 })).toBe(false);
    expect(isWithinMapBounds({ x: 10, y: -1 })).toBe(false);
    expect(isWithinMapBounds({ x: MAP_BOUNDS.width + 1, y: 10 })).toBe(false);
    expect(isWithinMapBounds({ x: 10, y: MAP_BOUNDS.height + 1 })).toBe(false);
  });

  it("rejects natural pixels of the world map mistaken for atlas units", () => {
    expect(isWithinMapBounds({ x: 1955, y: 4619 })).toBe(false);
  });
});

describe("placementHref", () => {
  it("routes each layer to its own collection", () => {
    expect(placementHref({ layer: "battle", slug: "red-wedding" })).toBe(
      "/battles/red-wedding/",
    );
    expect(placementHref({ layer: "event", slug: "the-pact" })).toBe(
      "/events/the-pact/",
    );
    expect(placementHref({ layer: "town", slug: "kings-landing" })).toBe(
      "/castles/kings-landing/",
    );
  });

  it("routes every declared layer, with no silent castle fallback", () => {
    const routes = Object.fromEntries(
      MAP_LAYERS.map((layer) => [layer, placementHref({ layer, slug: "s" })]),
    );
    expect(routes).toEqual({
      castle: "/castles/s/",
      town: "/castles/s/",
      ruin: "/castles/s/",
      watchtower: "/castles/s/",
      holdfast: "/castles/s/",
      battle: "/battles/s/",
      event: "/events/s/",
    });
  });
});

describe("selectPlacements", () => {
  const castles = [castle({ slug: "winterfell", coords: { x: 400, y: 430 } })];
  const battles = [
    battle({ slug: "red-wedding", coords: { x: 440, y: 645 } }),
    battle({ slug: "no-coords", location: "the Trident" }),
    battle({ slug: "drafted", coords: { x: 1, y: 2 }, draft: true }),
  ];
  const events = [
    event({ slug: "the-purple-wedding", coords: { x: 590, y: 830 } }),
    event({ slug: "union-location", location: { x: 100, y: 200 } }),
    event({ slug: "essos", location: "Meereen" }),
  ];

  it("returns one placement per layer with an href and coordinates", () => {
    const placements = selectPlacements({
      castles,
      battles,
      events,
      layers: ALL_LAYERS,
    });
    expect(placements.map((placement) => placement.slug)).toEqual([
      "winterfell",
      "red-wedding",
      "the-purple-wedding",
      "union-location",
    ]);
    expect(placements.map((placement) => placement.layer)).toEqual([
      "castle",
      "battle",
      "event",
      "event",
    ]);
    expect(placements[1].href).toBe("/battles/red-wedding/");
    expect(placements[2].coords).toEqual({ x: 590, y: 830 });
  });

  it("links by frontmatter slug, the one generateStaticParams builds routes from", () => {
    const renamedFile = {
      frontmatter: CastleSchema.parse({
        slug: "winterfell",
        name: "Winterfell",
        type: "castle",
        coords: { x: 400, y: 430 },
        sources: [],
      }),
      body: "",
      slug: "winterfell-draft-copy",
    };
    const placements = selectPlacements({
      castles: [renamedFile],
      battles: [],
      events: [],
      layers: new Set<MapLayer>(["castle"]),
    });
    expect(placements[0].href).toBe("/castles/winterfell/");
  });

  it("drops battles and events with no coordinates rather than defaulting", () => {
    const placements = selectPlacements({
      castles: [],
      battles,
      events: [],
      layers: ALL_LAYERS,
    });
    expect(placements.map((placement) => placement.slug)).toEqual([
      "red-wedding",
    ]);
  });

  it("drops drafts", () => {
    const placements = selectPlacements({
      castles: [],
      battles,
      events: [],
      layers: ALL_LAYERS,
    });
    expect(placements.some((placement) => placement.slug === "drafted")).toBe(
      false,
    );
  });

  it("honours the battle and event layer toggles independently", () => {
    const onlyBattles = selectPlacements({
      castles,
      battles,
      events,
      layers: new Set<MapLayer>(["battle"]),
    });
    expect(onlyBattles.map((placement) => placement.slug)).toEqual([
      "red-wedding",
    ]);

    const onlyEvents = selectPlacements({
      castles,
      battles,
      events,
      layers: new Set<MapLayer>(["event"]),
    });
    expect(onlyEvents.map((placement) => placement.layer)).toEqual([
      "event",
      "event",
    ]);
  });

  it("only ever places coordinates inside the atlas bounds", () => {
    const placements = selectPlacements({
      castles,
      battles,
      events,
      layers: ALL_LAYERS,
    });
    placements.forEach((placement) =>
      expect(isWithinMapBounds(placement.coords)).toBe(true),
    );
  });
});
