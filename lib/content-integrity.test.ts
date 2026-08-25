import { describe, expect, it } from "bun:test";
import {
  loadAllBattles,
  loadAllCastles,
  loadAllCharacters,
  loadAllDragons,
  loadAllEvents,
  loadAllHouses,
  loadAllWeapons,
} from "@/lib/content";
import {
  contentIntegrityErrors,
  reciprocalAsymmetries,
} from "@/lib/content-integrity";
import { MAP_BOUNDS } from "@/lib/map";
import {
  BattleSchema,
  CastleSchema,
  CharacterSchema,
  EventSchema,
} from "@/lib/schemas";

const LEGEND_DATE = { year: 300, era: "AC", precision: "year" };

function character(frontmatter: Record<string, unknown>) {
  const parsed = CharacterSchema.parse({
    born: null,
    died: null,
    "primary-house": null,
    ...frontmatter,
  });
  return { frontmatter: parsed, body: "", slug: parsed.slug };
}

describe("reciprocal asymmetries", () => {
  it("is quiet when both sides name each other", () => {
    expect(
      reciprocalAsymmetries({
        characters: [
          character({ slug: "arya", name: "Arya", parents: ["ned"] }),
          character({
            slug: "ned",
            name: "Ned",
            children: ["arya"],
            spouses: ["catelyn"],
          }),
          character({ slug: "catelyn", name: "Catelyn", spouses: ["ned"] }),
        ],
      }),
    ).toEqual([]);
  });

  it("reports a parent whose children omit the child", () => {
    expect(
      reciprocalAsymmetries({
        characters: [
          character({ slug: "arya", name: "Arya", parents: ["ned"] }),
          character({ slug: "ned", name: "Ned" }),
        ],
      }),
    ).toEqual([
      {
        source: "characters/arya",
        field: "parents",
        target: "characters/ned",
        expected: "children",
      },
    ]);
  });

  it("reports a child whose parents omit the parent", () => {
    expect(
      reciprocalAsymmetries({
        characters: [
          character({ slug: "arya", name: "Arya" }),
          character({ slug: "ned", name: "Ned", children: ["arya"] }),
        ],
      }),
    ).toEqual([
      {
        source: "characters/ned",
        field: "children",
        target: "characters/arya",
        expected: "parents",
      },
    ]);
  });

  it("reports a one-sided marriage", () => {
    expect(
      reciprocalAsymmetries({
        characters: [
          character({ slug: "ned", name: "Ned", spouses: ["catelyn"] }),
          character({ slug: "catelyn", name: "Catelyn" }),
        ],
      }),
    ).toEqual([
      {
        source: "characters/ned",
        field: "spouses",
        target: "characters/catelyn",
        expected: "spouses",
      },
    ]);
  });

  it("leaves a slug that resolves to nothing to the outbound check", () => {
    expect(
      reciprocalAsymmetries({
        characters: [
          character({ slug: "arya", name: "Arya", parents: ["nobody"] }),
        ],
      }),
    ).toEqual([]);
  });

  it("holds across the corpus", async () => {
    const characters = await loadAllCharacters();
    expect(reciprocalAsymmetries({ characters })).toEqual([]);
  });
});

function emptyCollections() {
  return {
    battles: [],
    castles: [],
    characters: [],
    dragons: [],
    events: [],
    houses: [],
    weapons: [],
  };
}

function placedCastle(coords: { x: number; y: number }) {
  return {
    body: "",
    slug: "off-map",
    frontmatter: CastleSchema.parse({
      slug: "off-map",
      name: "Off Map",
      type: "castle",
      coords,
    }),
  };
}

function placedBattle(coords: { x: number; y: number }) {
  return {
    body: "",
    slug: "off-map",
    frontmatter: BattleSchema.parse({
      slug: "off-map",
      name: "Off Map",
      type: "battle",
      start: LEGEND_DATE,
      end: LEGEND_DATE,
      coords,
    }),
  };
}

function placedEvent(coords: { x: number; y: number }) {
  return {
    body: "",
    slug: "off-map",
    frontmatter: EventSchema.parse({
      slug: "off-map",
      name: "Off Map",
      type: "battle",
      date: LEGEND_DATE,
      location: "nowhere",
      landmass: "westeros",
      coords,
    }),
  };
}

describe("outbound references", () => {
  it("validates battle mentions, which no check used to read", () => {
    const errors = contentIntegrityErrors({
      ...emptyCollections(),
      battles: [
        {
          body: "",
          slug: "b",
          frontmatter: BattleSchema.parse({
            slug: "b",
            name: "B",
            type: "battle",
            start: LEGEND_DATE,
            end: LEGEND_DATE,
            mentions: ["no-such-entry"],
          }),
        },
      ],
    });
    expect(errors).toEqual(["battles/b.mentions: missing no-such-entry"]);
  });

  // Battles and events used to be concatenated and pulled back apart with an
  // `in` probe on `commanders`. Each now carries its own rules, so the
  // collection an error names is the collection it came from.
  it("labels a battle and an event by their own collection", () => {
    const participants = [{ side: "A", houses: ["no-such-house"] }];
    const errors = contentIntegrityErrors({
      ...emptyCollections(),
      battles: [
        {
          body: "",
          slug: "b",
          frontmatter: BattleSchema.parse({
            slug: "b",
            name: "B",
            type: "battle",
            start: LEGEND_DATE,
            end: LEGEND_DATE,
            participants,
          }),
        },
      ],
      events: [
        {
          body: "",
          slug: "e",
          frontmatter: EventSchema.parse({
            slug: "e",
            name: "E",
            type: "wedding",
            date: LEGEND_DATE,
            location: "nowhere",
            landmass: "westeros",
            participants,
          }),
        },
      ],
    });
    expect(errors).toEqual([
      "battles/b.participants[0].houses: missing no-such-house",
      "events/e.participants[0].houses: missing no-such-house",
    ]);
  });
});

describe("content integrity", () => {
  it("has matching, unique slugs and resolvable cross-references", async () => {
    const [battles, castles, characters, dragons, events, houses, weapons] =
      await Promise.all([
        loadAllBattles(),
        loadAllCastles(),
        loadAllCharacters(),
        loadAllDragons(),
        loadAllEvents(),
        loadAllHouses(),
        loadAllWeapons(),
      ]);

    expect(
      contentIntegrityErrors({
        battles,
        castles,
        characters,
        dragons,
        events,
        houses,
        weapons,
      }),
    ).toEqual([]);
  });

  it("flags a castle, battle, or event placed outside the atlas bounds", () => {
    const errors = contentIntegrityErrors({
      ...emptyCollections(),
      castles: [placedCastle({ x: -1, y: 10 })],
      battles: [placedBattle({ x: 10, y: MAP_BOUNDS.height + 1 })],
      events: [placedEvent({ x: 1955, y: 4619 })],
    });

    expect(errors).toEqual([
      `castles/off-map.coords: (-1, 10) is outside the ${MAP_BOUNDS.width}x${MAP_BOUNDS.height} map`,
      `battles/off-map.coords: (10, ${MAP_BOUNDS.height + 1}) is outside the ${MAP_BOUNDS.width}x${MAP_BOUNDS.height} map`,
      `events/off-map.coords: (1955, 4619) is outside the ${MAP_BOUNDS.width}x${MAP_BOUNDS.height} map`,
    ]);
  });

  it("accepts a placement on the far corner of the atlas bounds", () => {
    const errors = contentIntegrityErrors({
      ...emptyCollections(),
      castles: [placedCastle({ x: MAP_BOUNDS.width, y: MAP_BOUNDS.height })],
      battles: [placedBattle({ x: 0, y: 0 })],
    });
    expect(errors).toEqual([]);
  });

  it("ignores battles and events that carry no coordinates at all", () => {
    const errors = contentIntegrityErrors({
      ...emptyCollections(),
      battles: [
        {
          body: "",
          slug: "off-map",
          frontmatter: BattleSchema.parse({
            slug: "off-map",
            name: "Off Map",
            type: "battle",
            start: LEGEND_DATE,
            end: LEGEND_DATE,
            location: "the Trident",
          }),
        },
      ],
    });
    expect(errors).toEqual([]);
  });
});
