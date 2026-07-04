import { describe, it, expect } from "vitest";
import {
  CastleSchema,
  HouseSchema,
  CharacterSchema,
  EventSchema,
  WeaponSchema,
  DragonSchema,
} from "@/lib/schemas";

describe("CastleSchema", () => {
  it("parses a complete valid castle", () => {
    const input = {
      slug: "winterfell",
      name: "Winterfell",
      type: "castle",
      "sub-region": "northern-mountains",
      "liege-house": "stark",
      founded: { year: -8000, era: "age-of-heroes", precision: "legendary" },
      "sworn-houses": ["karstark", "umber"],
      features: ["godswood"],
      coords: { x: 412, y: 280 },
      sources: [
        { type: "awoiaf", url: "https://example", license: "CC-BY-SA-4.0" },
      ],
      draft: false,
    };
    expect(() => CastleSchema.parse(input)).not.toThrow();
  });

  it("rejects an invalid type", () => {
    const input = {
      slug: "x",
      name: "X",
      type: "spaceport",
      coords: { x: 0, y: 0 },
      sources: [],
      draft: false,
    };
    expect(() => CastleSchema.parse(input)).toThrow();
  });

  it("defaults draft to false when omitted", () => {
    const input = {
      slug: "x",
      name: "X",
      type: "castle",
      coords: { x: 0, y: 0 },
      sources: [],
    };
    const parsed = CastleSchema.parse(input);
    expect(parsed.draft).toBe(false);
  });
});

describe("HouseSchema", () => {
  it("parses a Great House (null liege)", () => {
    const input = {
      slug: "stark",
      name: "House Stark",
      seat: "winterfell",
      liege: null,
      words: "Winter is Coming",
      sigil: { description: "A grey direwolf on a white field" },
      founded: { year: -8000, era: "age-of-heroes", precision: "legendary" },
      status: "extant",
      "sworn-from": ["karstark"],
      "cadet-houses": ["greystark"],
      sources: [],
      draft: false,
    };
    expect(() => HouseSchema.parse(input)).not.toThrow();
  });

  it("parses an infobox-rich house with seats, heads, regions, titles, weapons, and an extinct date", () => {
    const input = {
      slug: "targaryen",
      name: "House Targaryen",
      seat: "dragonstone",
      liege: null,
      words: "Fire and Blood",
      sigil: { description: "A red three-headed dragon on black" },
      founded: { year: -114, era: "BC", precision: "year" },
      extinct: { year: 283, era: "AC", precision: "year" },
      status: "exiled",
      "sworn-from": [],
      "cadet-houses": ["blackfyre"],
      seats: [
        { name: "Dragonstone", slug: "dragonstone", note: "formerly" },
        { name: "Great Pyramid", slug: "great-pyramid" },
      ],
      heads: [{ name: "Queen Daenerys I", slug: "daenerys-targaryen" }],
      regions: [{ name: "Slaver's Bay" }],
      titles: [{ name: "Dragonlord", note: "pre-Doom" }],
      "ancestral-weapons": ["blackfyre", "dark-sister"],
      sources: [],
    };
    expect(() => HouseSchema.parse(input)).not.toThrow();
  });

  it("rejects unknown status", () => {
    const input = {
      slug: "x",
      name: "X",
      seat: "y",
      liege: null,
      words: "",
      sigil: { description: "" },
      founded: { year: 0, era: "AC", precision: "year" },
      status: "partying",
      "sworn-from": [],
      "cadet-houses": [],
      sources: [],
    };
    expect(() => HouseSchema.parse(input)).toThrow();
  });
});

describe("CharacterSchema", () => {
  it("parses a named character", () => {
    const input = {
      slug: "eddard-stark",
      name: "Eddard Stark",
      sex: "m",
      born: { year: 263, era: "AC", precision: "year" },
      died: { year: 299, era: "AC", precision: "year" },
      "primary-house": "stark",
      "also-of-houses": [],
      parents: ["rickard-stark", "lyarra-stark"],
      spouses: ["catelyn-tully"],
      children: ["robb-stark"],
      titles: ["Lord of Winterfell"],
      placeholder: false,
      "placeholder-reason": null,
      sources: [],
      draft: false,
    };
    expect(() => CharacterSchema.parse(input)).not.toThrow();
  });

  it("allows a placeholder character with null name dates", () => {
    const input = {
      slug: "unnamed-stark-daughter",
      name: "Unnamed Stark daughter",
      sex: "f",
      born: null,
      died: null,
      "primary-house": "stark",
      "also-of-houses": [],
      parents: ["cregan-stark"],
      spouses: [],
      children: [],
      titles: [],
      placeholder: true,
      "placeholder-reason": "unnamed",
      sources: [],
      draft: false,
    };
    expect(() => CharacterSchema.parse(input)).not.toThrow();
  });

  it("defaults sex to null when omitted", () => {
    const input = {
      slug: "x",
      name: "X",
      born: null,
      died: null,
      "primary-house": "stark",
      "also-of-houses": [],
      parents: [],
      spouses: [],
      children: [],
      titles: [],
      sources: [],
      draft: false,
    };
    const parsed = CharacterSchema.parse(input);
    expect(parsed.sex).toBeNull();
  });

  it("accepts null primary-house for unaffiliated characters", () => {
    const input = {
      slug: "tormund",
      name: "Tormund",
      sex: "m",
      born: null,
      died: null,
      "primary-house": null,
      "also-of-houses": [],
      parents: [],
      spouses: [],
      children: [],
      titles: [],
      sources: [],
      draft: false,
    };
    const parsed = CharacterSchema.parse(input);
    expect(parsed["primary-house"]).toBeNull();
  });

  it("rejects sex values other than m, f, or null", () => {
    const input = {
      slug: "x",
      name: "X",
      sex: "other",
      born: null,
      died: null,
      "primary-house": "stark",
      "also-of-houses": [],
      parents: [],
      spouses: [],
      children: [],
      titles: [],
      sources: [],
      draft: false,
    };
    expect(() => CharacterSchema.parse(input)).toThrow();
  });
});

describe("EventSchema", () => {
  it("parses a battle with both sides", () => {
    const input = {
      slug: "red-wedding",
      name: "The Red Wedding",
      type: "betrayal",
      date: { year: 299, era: "AC", precision: "year" },
      location: "the-twins",
      landmass: "westeros",
      participants: [
        { side: "stark", houses: ["stark", "tully"] },
        { side: "frey", houses: ["frey", "bolton"] },
      ],
      outcome: "stark-defeat",
      casualties: ["robb-stark"],
      sources: [],
      draft: false,
    };
    expect(() => EventSchema.parse(input)).not.toThrow();
  });

  it("allows location as coords for field battles", () => {
    const input = {
      slug: "whispering-wood",
      name: "Battle of the Whispering Wood",
      type: "battle",
      date: { year: 298, era: "AC", precision: "year" },
      location: { x: 300, y: 400 },
      landmass: "westeros",
      participants: [],
      outcome: "stark-victory",
      casualties: [],
      sources: [],
      draft: false,
    };
    expect(() => EventSchema.parse(input)).not.toThrow();
  });
});

describe("WeaponSchema", () => {
  it("parses a Valyrian-steel sword bound to a house", () => {
    const input = {
      slug: "blackfyre",
      name: "Blackfyre",
      type: "sword",
      material: "valyrian-steel",
      status: "lost",
      "origin-house": "targaryen",
      "current-house": null,
      wielders: ["aegon-i-targaryen", "daemon-i-blackfyre"],
      aliases: [],
      mentions: ["targaryen", "blackfyre"],
      sources: [{ type: "awoiaf", url: "https://example" }],
      draft: false,
    };
    expect(() => WeaponSchema.parse(input)).not.toThrow();
  });

  it("rejects an unknown material", () => {
    const input = {
      slug: "x",
      name: "X",
      type: "sword",
      material: "mithril",
      status: "extant",
      "current-house": null,
      wielders: [],
      aliases: [],
      mentions: [],
      sources: [],
    };
    expect(() => WeaponSchema.parse(input)).toThrow();
  });

  it("defaults arrays and draft when omitted", () => {
    const input = {
      slug: "x",
      name: "X",
      type: "dagger",
      material: "steel",
      status: "extant",
      "current-house": null,
      sources: [],
    };
    const parsed = WeaponSchema.parse(input);
    expect(parsed.wielders).toEqual([]);
    expect(parsed.aliases).toEqual([]);
    expect(parsed.mentions).toEqual([]);
    expect(parsed.draft).toBe(false);
  });
});

describe("DragonSchema", () => {
  it("parses a Targaryen dragon with a rider chain", () => {
    const input = {
      slug: "vhagar",
      name: "Vhagar",
      color: "bronze and green",
      size: "monstrous",
      hatched: { year: -52, era: "BC", precision: "decade" },
      died: { year: 130, era: "AC", precision: "year" },
      status: "dead",
      house: "targaryen",
      riders: ["visenya-targaryen", "aemond-targaryen"],
      aliases: [],
      mentions: ["targaryen"],
      sources: [],
      draft: false,
    };
    expect(() => DragonSchema.parse(input)).not.toThrow();
  });

  it("parses a wild dragon with no house and no riders", () => {
    const input = {
      slug: "cannibal",
      name: "The Cannibal",
      hatched: null,
      died: null,
      status: "wild",
      house: null,
      sources: [],
    };
    const parsed = DragonSchema.parse(input);
    expect(parsed.house).toBeNull();
    expect(parsed.riders).toEqual([]);
  });

  it("rejects an unknown status", () => {
    const input = {
      slug: "x",
      name: "X",
      hatched: null,
      died: null,
      status: "sleeping",
      house: null,
      sources: [],
    };
    expect(() => DragonSchema.parse(input)).toThrow();
  });
});
