import { describe, it, expect } from "bun:test";
import {
  ALL_CASTLE_TYPES,
  MAP_BOUNDS,
  MAP_LAYERS,
  WORLD_MAP_RASTER,
  entryCoords,
  isCoords,
  isWithinMapBounds,
  isWithinWorldMapRaster,
  placementHref,
  selectPlacements,
  selectVisibleCastles,
  selectWorldMapMarkers,
  summarizeBody,
  type MapLayer,
} from "@/lib/map";
import {
  BattleSchema,
  CastleSchema,
  EventSchema,
  HouseSchema,
} from "@/lib/schemas";

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

describe("isWithinWorldMapRaster", () => {
  it("accepts the corners of the raster", () => {
    expect(isWithinWorldMapRaster({ x: 0, y: 0 })).toBe(true);
    expect(
      isWithinWorldMapRaster({
        x: WORLD_MAP_RASTER.width,
        y: WORLD_MAP_RASTER.height,
      }),
    ).toBe(true);
  });

  it("rejects negatives and anything past the far edge", () => {
    expect(isWithinWorldMapRaster({ x: -1, y: 10 })).toBe(false);
    expect(isWithinWorldMapRaster({ x: 10, y: -1 })).toBe(false);
    expect(
      isWithinWorldMapRaster({ x: WORLD_MAP_RASTER.width + 1, y: 10 }),
    ).toBe(false);
    expect(
      isWithinWorldMapRaster({ x: 10, y: WORLD_MAP_RASTER.height + 1 }),
    ).toBe(false);
  });
});

describe("selectWorldMapMarkers", () => {
  const stark = {
    frontmatter: HouseSchema.parse({
      slug: "stark",
      name: "House Stark",
      rank: "lordly",
      seat: "winterfell",
      liege: null,
      words: "Winter is Coming",
      status: "extant",
      sigil: { description: "A direwolf", provenance: "canon" },
      founded: { year: -8000, era: "age-of-heroes", precision: "legendary" },
    }),
    body: "",
    slug: "stark",
  };
  const houses = [stark];
  const castles = [
    {
      ...castle({
        slug: "kings-landing",
        name: "King's Landing",
        "world-map": { x: 1955, y: 4619 },
      }),
      body: "The capital of the Seven Kingdoms.\n\n## Detail\n\nMore.",
    },
    castle({ slug: "winterfell", name: "Winterfell" }),
    castle({
      slug: "draft-seat",
      name: "Draft Seat",
      draft: true,
      "world-map": { x: 1, y: 1 },
    }),
    castle({
      slug: "lordsport",
      name: "Lordsport",
      type: "town",
      "liege-house": "stark",
      "world-map": { x: 1100, y: 4030 },
    }),
  ];

  it("places only castles that carry a `world-map` pixel, linking by slug", () => {
    expect(selectWorldMapMarkers({ castles, houses })).toEqual([
      {
        slug: "kings-landing",
        name: "King's Landing",
        href: "/castles/kings-landing/",
        x: 1955,
        y: 4619,
        type: "castle",
        summary: "The capital of the Seven Kingdoms.",
      },
      {
        slug: "lordsport",
        name: "Lordsport",
        href: "/castles/lordsport/",
        x: 1100,
        y: 4030,
        type: "town",
        house: "House Stark",
        summary: "",
      },
    ]);
  });

  it("leaves the house off when the liege does not resolve", () => {
    const [marker] = selectWorldMapMarkers({
      castles: [
        castle({
          slug: "orphan",
          "liege-house": "nobody",
          "world-map": { x: 5, y: 5 },
        }),
      ],
      houses,
    });
    expect(marker).toBeDefined();
    expect(marker).not.toHaveProperty("house");
  });

  it("drops drafts rather than linking to a page that is never built", () => {
    const slugs = selectWorldMapMarkers({ castles, houses }).map((m) => m.slug);
    expect(slugs).not.toContain("draft-seat");
  });

  it("returns nothing for an empty corpus", () => {
    expect(selectWorldMapMarkers({ castles: [], houses: [] })).toEqual([]);
  });
});

describe("summarizeBody", () => {
  it("takes the first prose paragraph and skips headings", () => {
    expect(summarizeBody("## Heading\n\nFirst.\n\nSecond.")).toBe("First.");
  });

  it("flattens links and emphasis to plain text", () => {
    expect(summarizeBody("A [keep](/x/) with *old* walls.")).toBe(
      "A keep with old walls.",
    );
  });

  it("drops spoiler spans", () => {
    expect(summarizeBody("Built long ago. ||death|He died here.||")).toBe(
      "Built long ago.",
    );
  });

  it("truncates a long paragraph on a word boundary", () => {
    const out = summarizeBody("word ".repeat(80));
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(181);
  });

  it("returns an empty string for an empty body", () => {
    expect(summarizeBody("")).toBe("");
  });
});
