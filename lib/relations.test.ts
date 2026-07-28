import { describe, it, expect } from "bun:test";
import { buildRelationGraph, findOrphanSlugs } from "@/lib/relations";
import {
  CastleSchema,
  CharacterSchema,
  EventSchema,
  HouseSchema,
} from "@/lib/schemas";

function castle(data: Parameters<typeof CastleSchema.parse>[0]) {
  return {
    frontmatter: CastleSchema.parse(data),
    body: "",
    slug: (data as { slug: string }).slug,
  };
}

function house(data: Record<string, unknown> & { slug: string }) {
  return {
    frontmatter: HouseSchema.parse({ rank: "lordly", ...data }),
    body: "",
    slug: data.slug,
  };
}

function character(data: Parameters<typeof CharacterSchema.parse>[0]) {
  return {
    frontmatter: CharacterSchema.parse(data),
    body: "",
    slug: (data as { slug: string }).slug,
  };
}

function event(data: Parameters<typeof EventSchema.parse>[0]) {
  return {
    frontmatter: EventSchema.parse(data),
    body: "",
    slug: (data as { slug: string }).slug,
  };
}

const starkFounded = { year: 0, era: "AC", precision: "year" };
const winterfellCoords = { x: 0, y: 0 };
const eddardBorn = { year: 263, era: "AC", precision: "year" };
const eddardDied = { year: 299, era: "AC", precision: "year" };

describe("buildRelationGraph", () => {
  it("builds a graph from castles and houses", () => {
    const castles = [
      castle({
        slug: "winterfell",
        name: "Winterfell",
        type: "castle",
        "liege-house": "stark",
        "sworn-houses": ["karstark"],
        coords: winterfellCoords,
        sources: [],
      }),
    ];
    const houses = [
      house({
        slug: "stark",
        name: "House Stark",
        seat: "winterfell",
        liege: null,
        words: "",
        sigil: { description: "", provenance: "invented" },
        founded: starkFounded,
        status: "extant",
        "sworn-from": ["karstark"],
        "cadet-houses": [],
        sources: [],
      }),
    ];
    const graph = buildRelationGraph({
      castles,
      houses,
      characters: [],
      events: [],
    });
    expect(graph.castleByHouse.get("stark")).toEqual(["winterfell"]);
    expect(graph.houseBySeat.get("winterfell")).toBe("stark");
  });

  it("skips castles that have no liege-house when building `castleByHouse`", () => {
    const castles = [
      castle({
        slug: "old-anchor",
        name: "Old Anchor",
        type: "ruin",
        "sworn-houses": [],
        coords: winterfellCoords,
        sources: [],
      }),
    ];
    const graph = buildRelationGraph({
      castles,
      houses: [],
      characters: [],
      events: [],
    });
    expect(graph.castleByHouse.size).toBe(0);
  });

  it("groups characters by their primary-house and skips characters with a null primary-house", () => {
    const characters = [
      character({
        slug: "eddard-stark",
        name: "Eddard Stark",
        born: eddardBorn,
        died: eddardDied,
        "primary-house": "stark",
      }),
      character({
        slug: "robb-stark",
        name: "Robb Stark",
        born: eddardBorn,
        died: eddardDied,
        "primary-house": "stark",
      }),
      character({
        slug: "syrio-forel",
        name: "Syrio Forel",
        born: null,
        died: null,
        "primary-house": null,
      }),
    ];
    const graph = buildRelationGraph({
      castles: [],
      houses: [],
      characters,
      events: [],
    });
    expect(graph.membersByHouse.get("stark")).toEqual([
      "eddard-stark",
      "robb-stark",
    ]);
    expect(graph.membersByHouse.size).toBe(1);
  });

  it("indexes events by string `location` and skips events located by raw coords", () => {
    const events = [
      event({
        slug: "fall-of-winterfell",
        name: "Fall of Winterfell",
        type: "battle",
        date: eddardDied,
        location: "winterfell",
        landmass: "westeros",
        participants: [],
        casualties: [],
        sources: [],
      }),
      event({
        slug: "skirmish-on-the-kingsroad",
        name: "Skirmish on the Kingsroad",
        type: "battle",
        date: eddardDied,
        location: { x: 100, y: 200 },
        landmass: "westeros",
        participants: [],
        casualties: [],
        sources: [],
      }),
    ];
    const graph = buildRelationGraph({
      castles: [],
      houses: [],
      characters: [],
      events,
    });
    expect(graph.eventsByLocation.get("winterfell")).toEqual([
      "fall-of-winterfell",
    ]);
    expect(graph.eventsByLocation.size).toBe(1);
  });
});

describe("findOrphanSlugs", () => {
  it("returns slugs referenced but not defined", () => {
    const castles = [
      castle({
        slug: "winterfell",
        name: "Winterfell",
        type: "castle",
        "liege-house": "stark",
        "sworn-houses": ["ghostvale"],
        coords: winterfellCoords,
        sources: [],
      }),
    ];
    const houses = [
      house({
        slug: "stark",
        name: "House Stark",
        seat: "winterfell",
        liege: null,
        words: "",
        sigil: { description: "", provenance: "invented" },
        founded: starkFounded,
        status: "extant",
        "sworn-from": [],
        "cadet-houses": [],
        sources: [],
      }),
    ];
    const orphans = findOrphanSlugs({
      castles,
      houses,
      characters: [],
      events: [],
    });
    expect(orphans).toContain("ghostvale");
  });

  it("flags unresolved character parents, spouses, children, and primary-house refs", () => {
    const characters = [
      character({
        slug: "eddard-stark",
        name: "Eddard Stark",
        born: eddardBorn,
        died: eddardDied,
        "primary-house": "missing-house",
        parents: ["missing-parent"],
        spouses: ["catelyn-stark"],
        children: ["missing-child"],
      }),
      character({
        slug: "catelyn-stark",
        name: "Catelyn Stark",
        born: null,
        died: null,
        "primary-house": null,
      }),
    ];
    const orphans = findOrphanSlugs({
      castles: [],
      houses: [],
      characters,
      events: [],
    });
    expect(orphans).toEqual(
      expect.arrayContaining([
        "missing-house",
        "missing-parent",
        "missing-child",
      ]),
    );
    expect(orphans).not.toContain("catelyn-stark");
  });

  it("flags unresolved event location, participant houses, and casualties", () => {
    const events = [
      event({
        slug: "trident",
        name: "Battle of the Trident",
        type: "battle",
        date: eddardDied,
        location: "missing-castle",
        landmass: "westeros",
        participants: [
          { side: "rebels", houses: ["missing-house"] },
          { side: "loyalists", houses: ["targaryen"] },
        ],
        casualties: ["missing-character"],
        sources: [],
      }),
      event({
        slug: "coord-only",
        name: "Coord-only event",
        type: "battle",
        date: eddardDied,
        location: { x: 1, y: 2 },
        landmass: "westeros",
        participants: [],
        casualties: [],
        sources: [],
      }),
    ];
    const orphans = findOrphanSlugs({
      castles: [],
      houses: [],
      characters: [],
      events,
    });
    expect(orphans).toEqual(
      expect.arrayContaining([
        "missing-castle",
        "missing-house",
        "targaryen",
        "missing-character",
      ]),
    );
  });

  it("returns empty when all references resolve", () => {
    const houses = [
      house({
        slug: "stark",
        name: "House Stark",
        seat: "winterfell",
        liege: null,
        words: "",
        sigil: { description: "", provenance: "invented" },
        founded: starkFounded,
        status: "extant",
        "sworn-from": [],
        "cadet-houses": [],
        sources: [],
      }),
    ];
    const castles = [
      castle({
        slug: "winterfell",
        name: "Winterfell",
        type: "castle",
        "liege-house": "stark",
        "sworn-houses": [],
        coords: winterfellCoords,
        sources: [],
      }),
    ];
    const orphans = findOrphanSlugs({
      castles,
      houses,
      characters: [],
      events: [],
    });
    expect(orphans).toHaveLength(0);
  });
});
