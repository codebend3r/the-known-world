import { describe, expect, it } from "bun:test";
import { contentIntegrityErrors } from "@/lib/content-integrity";
import {
  dateIntegrityDefects,
  dateIntegrityErrors,
  ERA_YEAR_BOUNDS,
  MAX_LIFESPAN_YEARS,
  type DateCollections,
  type DateDefectClass,
} from "@/lib/date-integrity";
import {
  BattleSchema,
  CastleSchema,
  CharacterSchema,
  DragonSchema,
  EventSchema,
  HouseSchema,
  WeaponSchema,
} from "@/lib/schemas";

function emptyCollections(): DateCollections {
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

function character(frontmatter: Record<string, unknown>) {
  const parsed = CharacterSchema.parse({
    born: null,
    died: null,
    "primary-house": null,
    ...frontmatter,
  });
  return { frontmatter: parsed, body: "", slug: parsed.slug };
}

function house(frontmatter: Record<string, unknown>) {
  const parsed = HouseSchema.parse({
    seat: "",
    liege: null,
    words: "",
    sigil: { description: "", provenance: "invented" },
    rank: "lordly",
    status: "extant",
    ...frontmatter,
  });
  return { frontmatter: parsed, body: "", slug: parsed.slug };
}

function weapon(frontmatter: Record<string, unknown>) {
  const parsed = WeaponSchema.parse({
    type: "sword",
    material: "steel",
    status: "extant",
    "current-house": null,
    ...frontmatter,
  });
  return { frontmatter: parsed, body: "", slug: parsed.slug };
}

function dragon(frontmatter: Record<string, unknown>) {
  const parsed = DragonSchema.parse({
    hatched: null,
    died: null,
    status: "dead",
    house: null,
    ...frontmatter,
  });
  return { frontmatter: parsed, body: "", slug: parsed.slug };
}

function battle(frontmatter: Record<string, unknown>) {
  const parsed = BattleSchema.parse({ type: "battle", ...frontmatter });
  return { frontmatter: parsed, body: "", slug: parsed.slug };
}

function castle(frontmatter: Record<string, unknown>) {
  const parsed = CastleSchema.parse({
    type: "castle",
    coords: { x: 1, y: 1 },
    ...frontmatter,
  });
  return { frontmatter: parsed, body: "", slug: parsed.slug };
}

function event(frontmatter: Record<string, unknown>) {
  const parsed = EventSchema.parse({
    type: "wedding",
    location: "somewhere",
    landmass: "westeros",
    ...frontmatter,
  });
  return { frontmatter: parsed, body: "", slug: parsed.slug };
}

/** A plain year-precision AC date, the shape most of these fixtures want. */
function y(year: number) {
  return { year, era: "AC", precision: "year" };
}

function classesOf(collections: DateCollections): DateDefectClass[] {
  return dateIntegrityDefects(collections).map((defect) => defect.defect);
}

describe("ERA_YEAR_BOUNDS", () => {
  it("covers every era the schema accepts", () => {
    expect(
      Object.values(ERA_YEAR_BOUNDS).every(({ from, to }) => from < to),
    ).toBe(true);
    expect(Object.keys(ERA_YEAR_BOUNDS)).toHaveLength(9);
  });
});

describe("sign", () => {
  it("flags a BC year stored as a negative number", () => {
    const collections = {
      ...emptyCollections(),
      characters: [
        character({
          slug: "a",
          name: "A",
          born: { year: -27, era: "BC", precision: "year" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual(["sign"]);
  });

  it("accepts a BC year stored as a positive magnitude", () => {
    const collections = {
      ...emptyCollections(),
      characters: [
        character({
          slug: "a",
          name: "A",
          born: { year: 27, era: "BC", precision: "year" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual([]);
  });

  it("flags an AC year of zero", () => {
    const collections = {
      ...emptyCollections(),
      characters: [
        character({
          slug: "a",
          name: "A",
          born: { year: 0, era: "AC", precision: "year" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual(["sign"]);
  });

  it("reports a sign error once rather than also as a range error", () => {
    const collections = {
      ...emptyCollections(),
      characters: [
        character({
          slug: "a",
          name: "A",
          born: { year: -9000, era: "BC", precision: "legendary" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual(["sign"]);
  });
});

describe("era-range", () => {
  it("flags a pre-Conquest era carrying year zero", () => {
    const collections = {
      ...emptyCollections(),
      weapons: [
        weapon({
          slug: "w",
          name: "W",
          forged: { year: 0, era: "age-of-heroes", precision: "legendary" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual(["era-range"]);
  });

  it("accepts a year inside its era's band", () => {
    const collections = {
      ...emptyCollections(),
      weapons: [
        weapon({
          slug: "w",
          name: "W",
          forged: { year: -8000, era: "age-of-heroes", precision: "legendary" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual([]);
  });

  it("flags an AC year beyond the end of the corpus", () => {
    const collections = {
      ...emptyCollections(),
      houses: [
        house({
          slug: "h",
          name: "H",
          founded: { year: 700, era: "AC", precision: "era" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual(["era-range"]);
  });

  it("accepts the same year once the era is moved to BC", () => {
    const collections = {
      ...emptyCollections(),
      houses: [
        house({
          slug: "h",
          name: "H",
          founded: { year: 700, era: "BC", precision: "era" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual([]);
  });
});

describe("ordering", () => {
  it("flags a battle that ends before it starts", () => {
    const collections = {
      ...emptyCollections(),
      battles: [
        battle({
          slug: "b",
          name: "B",
          start: { year: 299, era: "AC", precision: "year" },
          end: { year: 298, era: "AC", precision: "year" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual(["ordering"]);
  });

  it("lets decade precision absorb a one-year inversion", () => {
    const collections = {
      ...emptyCollections(),
      battles: [
        battle({
          slug: "b",
          name: "B",
          start: { year: 299, era: "AC", precision: "decade" },
          end: { year: 298, era: "AC", precision: "year" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual([]);
  });

  it("flags a weapon destroyed before it was forged", () => {
    const collections = {
      ...emptyCollections(),
      weapons: [
        weapon({
          slug: "w",
          name: "W",
          status: "destroyed",
          forged: { year: 300, era: "AC", precision: "year" },
          destroyed: { year: 299, era: "AC", precision: "year" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual(["ordering"]);
  });

  it("flags a dragon that died before it hatched", () => {
    const collections = {
      ...emptyCollections(),
      dragons: [
        dragon({
          slug: "d",
          name: "D",
          hatched: { year: 100, era: "AC", precision: "year" },
          died: { year: 50, era: "AC", precision: "year" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual(["ordering"]);
  });

  it("reads BC and AC on one axis rather than as raw numbers", () => {
    const collections = {
      ...emptyCollections(),
      dragons: [
        dragon({
          slug: "d",
          name: "D",
          hatched: { year: 100, era: "BC", precision: "decade" },
          died: { year: 94, era: "AC", precision: "year" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual([]);
  });

  it("flags a house extinct before it was founded", () => {
    const collections = {
      ...emptyCollections(),
      houses: [
        house({
          slug: "h",
          name: "H",
          status: "extinct",
          founded: { year: 200, era: "AC", precision: "year" },
          extinct: { year: 100, era: "AC", precision: "year" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual(["ordering"]);
  });
});

describe("lifespan", () => {
  it("flags an age beyond the bound", () => {
    const collections = {
      ...emptyCollections(),
      characters: [
        character({
          slug: "a",
          name: "A",
          born: { year: 100, era: "AC", precision: "year" },
          died: {
            year: 100 + MAX_LIFESPAN_YEARS + 1,
            era: "AC",
            precision: "year",
          },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual(["lifespan"]);
  });

  it("accepts Maester Aemon's 102 years", () => {
    const collections = {
      ...emptyCollections(),
      characters: [
        character({
          slug: "a",
          name: "A",
          born: { year: 198, era: "AC", precision: "year" },
          died: { year: 300, era: "AC", precision: "year" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual([]);
  });

  it("skips dates that would not print an age", () => {
    const collections = {
      ...emptyCollections(),
      characters: [
        character({
          slug: "a",
          name: "A",
          born: { year: -8000, era: "long-night", precision: "era" },
          died: { year: 305, era: "AC", precision: "year" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual([]);
  });
});

describe("lineage", () => {
  it("flags a child born too soon after its parent", () => {
    const collections = {
      ...emptyCollections(),
      characters: [
        character({
          slug: "parent",
          name: "P",
          born: { year: 250, era: "AC", precision: "year" },
        }),
        character({
          slug: "child",
          name: "C",
          born: { year: 258, era: "AC", precision: "year" },
          parents: ["parent"],
        }),
      ],
    };
    expect(classesOf(collections)).toEqual(["lineage"]);
  });

  it("lets decade precision on both dates clear a borderline gap", () => {
    const collections = {
      ...emptyCollections(),
      characters: [
        character({
          slug: "parent",
          name: "P",
          born: { year: 250, era: "AC", precision: "decade" },
        }),
        character({
          slug: "child",
          name: "C",
          born: { year: 258, era: "AC", precision: "decade" },
          parents: ["parent"],
        }),
      ],
    };
    expect(classesOf(collections)).toEqual([]);
  });

  it("allows a posthumous birth but not one years later", () => {
    const build = (childBorn: number) => ({
      ...emptyCollections(),
      characters: [
        character({
          slug: "parent",
          name: "P",
          born: { year: 250, era: "AC", precision: "year" },
          died: { year: 285, era: "AC", precision: "year" },
        }),
        character({
          slug: "child",
          name: "C",
          born: { year: childBorn, era: "AC", precision: "year" },
          parents: ["parent"],
        }),
      ],
    });
    expect(classesOf(build(286))).toEqual([]);
    expect(classesOf(build(290))).toEqual(["lineage"]);
  });
});

describe("lifespan coverage", () => {
  // The table in `lifespanRows` is the one place that says which collection
  // dates which way. These lock the matrix in so a silent gap is a test
  // failure, not a defect class that quietly stops firing for a collection.
  it("orders every collection that declares a terminal date", () => {
    const ordered = {
      ...emptyCollections(),
      characters: [
        character({ slug: "c", name: "C", born: y(300), died: y(280) }),
      ],
      houses: [
        house({ slug: "h", name: "H", founded: y(300), extinct: y(280) }),
      ],
      weapons: [
        weapon({ slug: "w", name: "W", forged: y(300), destroyed: y(280) }),
      ],
      dragons: [
        dragon({ slug: "d", name: "D", hatched: y(300), died: y(280) }),
      ],
      battles: [battle({ slug: "b", name: "B", start: y(300), end: y(280) })],
    };
    const ordering = dateIntegrityDefects(ordered).filter(
      (defect) => defect.defect === "ordering",
    );
    expect(ordering.map((defect) => defect.collection)).toEqual([
      "characters",
      "houses",
      "weapons",
      "dragons",
      "battles",
    ]);
  });

  it("range-checks the single-date collections too", () => {
    const dated = {
      ...emptyCollections(),
      castles: [castle({ slug: "ca", name: "Ca", founded: y(5000) })],
      events: [event({ slug: "e", name: "E", date: y(5000) })],
    };
    const ranges = dateIntegrityDefects(dated).filter(
      (defect) => defect.defect === "era-range",
    );
    expect(ranges.map((defect) => defect.collection)).toEqual([
      "castles",
      "events",
    ]);
  });
});

describe("status", () => {
  it("flags an extant weapon carrying a destroyed date", () => {
    const collections = {
      ...emptyCollections(),
      weapons: [
        weapon({
          slug: "w",
          name: "W",
          status: "extant",
          destroyed: { year: 299, era: "AC", precision: "year" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual(["status"]);
  });

  it("flags a wild dragon carrying a died date", () => {
    const collections = {
      ...emptyCollections(),
      dragons: [
        dragon({
          slug: "d",
          name: "D",
          status: "wild",
          died: { year: 300, era: "AC", precision: "year" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual(["status"]);
  });

  it("flags an extant house carrying an extinct date", () => {
    const collections = {
      ...emptyCollections(),
      houses: [
        house({
          slug: "h",
          name: "H",
          status: "extant",
          founded: { year: 100, era: "AC", precision: "year" },
          extinct: { year: 200, era: "AC", precision: "year" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual(["status"]);
  });
});

describe("precision", () => {
  it("flags an exact date on an entry that cites nothing", () => {
    const collections = {
      ...emptyCollections(),
      battles: [
        battle({
          slug: "b",
          name: "B",
          start: { year: 41, era: "AC", precision: "exact" },
          end: { year: 41, era: "AC", precision: "exact" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual(["precision", "precision"]);
  });

  it("accepts an exact date backed by a source", () => {
    const collections = {
      ...emptyCollections(),
      battles: [
        battle({
          slug: "b",
          name: "B",
          start: { year: 41, era: "AC", precision: "exact" },
          end: { year: 41, era: "AC", precision: "exact" },
          sources: [{ type: "awoiaf" }],
        }),
      ],
    };
    expect(classesOf(collections)).toEqual([]);
  });

  it("accepts a year-precision date with nothing cited", () => {
    const collections = {
      ...emptyCollections(),
      battles: [
        battle({
          slug: "b",
          name: "B",
          start: { year: 41, era: "AC", precision: "year" },
          end: { year: 48, era: "AC", precision: "year" },
        }),
      ],
    };
    expect(classesOf(collections)).toEqual([]);
  });
});

describe("dateIntegrityErrors", () => {
  it("names the collection, slug, field, and class", () => {
    const collections = {
      ...emptyCollections(),
      characters: [
        character({
          slug: "aegon-i-targaryen",
          name: "Aegon",
          born: { year: -27, era: "BC", precision: "year" },
        }),
      ],
    };
    expect(dateIntegrityErrors(collections)).toHaveLength(1);
    expect(dateIntegrityErrors(collections)[0]).toStartWith(
      "characters/aegon-i-targaryen.born: [sign]",
    );
  });
});

describe("contentIntegrityErrors", () => {
  it("surfaces date defects, so CI gates them", () => {
    const collections = {
      ...emptyCollections(),
      characters: [
        character({
          slug: "a",
          name: "A",
          born: { year: -27, era: "BC", precision: "year" },
        }),
      ],
    };
    expect(contentIntegrityErrors(collections)).toEqual(
      dateIntegrityErrors(collections),
    );
  });
});
