import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import { HouseInfobox } from "@/components/HouseInfobox";
import type { House, Castle, Character, Weapon, Dragon } from "@/lib/schemas";

const targaryen: House = {
  rank: "royal",
  slug: "targaryen",
  name: "House Targaryen",
  seat: "dragonstone",
  liege: null,
  words: "Fire and Blood",
  sigil: {
    description: "A red three-headed dragon on black",
    provenance: "canon",
  },
  founded: { year: -114, era: "BC", precision: "year" },
  status: "exiled",
  "sworn-from": [],
  "cadet-houses": [],
  mentions: [],
  sources: [],
  draft: false,
};

const dragonstone: Castle = {
  slug: "dragonstone",
  name: "Dragonstone",
  type: "castle",
  coords: { x: 0, y: 0 },
  "sworn-houses": [],
  features: [],
  sources: [],
  draft: false,
};

const blackfyre: Weapon = {
  slug: "blackfyre",
  name: "Blackfyre",
  type: "sword",
  material: "valyrian-steel",
  status: "lost",
  "origin-house": "targaryen",
  "current-house": null,
  wielders: [],
  aliases: [],
  mentions: [],
  sources: [],
  draft: false,
};

const balerion: Dragon = {
  slug: "balerion",
  name: "Balerion",
  hatched: null,
  died: null,
  status: "dead",
  house: "targaryen",
  riders: [],
  aliases: [],
  mentions: [],
  sources: [],
  draft: false,
};

const castlesBySlug = new Map<string, Castle>([["dragonstone", dragonstone]]);
const charactersBySlug = new Map<string, Character>();
const housesBySlug = new Map<string, House>([["targaryen", targaryen]]);

describe("HouseInfobox", () => {
  it("links each ancestral weapon to /weapons/<slug>/ when present in the map", () => {
    const targaryenWithWeapon: House = {
      ...targaryen,
      "ancestral-weapons": ["blackfyre"],
    };
    render(
      <HouseInfobox
        house={targaryenWithWeapon}
        castlesBySlug={castlesBySlug}
        charactersBySlug={charactersBySlug}
        housesBySlug={housesBySlug}
        weaponsBySlug={new Map([["blackfyre", blackfyre]])}
        dragonsForHouse={[]}
      />,
    );
    const link = screen.getByRole("link", { name: /^blackfyre$/i });
    expect(link.getAttribute("href")).toBe("/weapons/blackfyre/");
  });

  it("falls back to a humanized slug when the weapon is not yet seeded", () => {
    const targaryenWithWeapon: House = {
      ...targaryen,
      "ancestral-weapons": ["dark-sister"],
    };
    render(
      <HouseInfobox
        house={targaryenWithWeapon}
        castlesBySlug={castlesBySlug}
        charactersBySlug={charactersBySlug}
        housesBySlug={housesBySlug}
        weaponsBySlug={new Map()}
        dragonsForHouse={[]}
      />,
    );
    expect(screen.getByText("Dark Sister")).toBeDefined();
    expect(screen.queryByRole("link", { name: /dark sister/i })).toBeNull();
  });

  it("renders a Dragons row listing every dragon whose `house` matches", () => {
    render(
      <HouseInfobox
        house={targaryen}
        castlesBySlug={castlesBySlug}
        charactersBySlug={charactersBySlug}
        housesBySlug={housesBySlug}
        weaponsBySlug={new Map()}
        dragonsForHouse={[balerion]}
      />,
    );
    expect(screen.getByText("Dragons")).toBeDefined();
    const link = screen.getByRole("link", { name: /balerion/i });
    expect(link.getAttribute("href")).toBe("/dragons/balerion/");
  });

  it("renders the Seats row for the default single-seat case", () => {
    render(
      <HouseInfobox
        house={targaryen}
        castlesBySlug={castlesBySlug}
        charactersBySlug={charactersBySlug}
        housesBySlug={housesBySlug}
        weaponsBySlug={new Map()}
        dragonsForHouse={[]}
      />,
    );
    expect(screen.getByText("Seats")).toBeDefined();
    const link = screen.getByRole("link", { name: /dragonstone/i });
    expect(link.getAttribute("href")).toBe("/castles/dragonstone/");
  });

  it('renders "None; sovereign" for a house with no liege', () => {
    render(
      <HouseInfobox
        house={targaryen}
        castlesBySlug={castlesBySlug}
        charactersBySlug={charactersBySlug}
        housesBySlug={housesBySlug}
        weaponsBySlug={new Map()}
        dragonsForHouse={[]}
      />,
    );
    expect(screen.getByText(/none; sovereign/i)).toBeDefined();
  });

  it("renders the liege as a plain span when the liege slug is not in the houses map", () => {
    const targaryenSworn: House = {
      ...targaryen,
      liege: "valyrian-freehold",
    };
    render(
      <HouseInfobox
        house={targaryenSworn}
        castlesBySlug={castlesBySlug}
        charactersBySlug={charactersBySlug}
        housesBySlug={housesBySlug}
        weaponsBySlug={new Map()}
        dragonsForHouse={[]}
      />,
    );
    expect(
      screen.queryByRole("link", { name: /valyrian-freehold/i }),
    ).toBeNull();
    expect(screen.getByText("valyrian-freehold")).toBeDefined();
  });

  it('renders a singular "Cadet branch" row when exactly one cadet is set', () => {
    const targaryenWithCadet: House = {
      ...targaryen,
      "cadet-houses": ["blackfyre"],
    };
    render(
      <HouseInfobox
        house={targaryenWithCadet}
        castlesBySlug={castlesBySlug}
        charactersBySlug={charactersBySlug}
        housesBySlug={housesBySlug}
        weaponsBySlug={new Map()}
        dragonsForHouse={[]}
      />,
    );
    expect(screen.getByText("Cadet branch")).toBeDefined();
    expect(screen.queryByText("Cadet branches")).toBeNull();
    expect(screen.getByText("House Blackfyre")).toBeDefined();
  });

  it('renders a plural "Cadet branches" row with multiple cadets', () => {
    const targaryenWithCadets: House = {
      ...targaryen,
      "cadet-houses": ["blackfyre", "velaryon"],
    };
    render(
      <HouseInfobox
        house={targaryenWithCadets}
        castlesBySlug={castlesBySlug}
        charactersBySlug={charactersBySlug}
        housesBySlug={housesBySlug}
        weaponsBySlug={new Map()}
        dragonsForHouse={[]}
      />,
    );
    expect(screen.getByText("Cadet branches")).toBeDefined();
    expect(screen.queryByText("Cadet branch")).toBeNull();
  });

  it("renders the Founded row with the year + era for AC/BC dates", () => {
    render(
      <HouseInfobox
        house={targaryen}
        castlesBySlug={castlesBySlug}
        charactersBySlug={charactersBySlug}
        housesBySlug={housesBySlug}
        weaponsBySlug={new Map()}
        dragonsForHouse={[]}
      />,
    );
    expect(screen.getByText("Founded")).toBeDefined();
    expect(screen.getByText("114 BC")).toBeDefined();
  });

  it("humanizes a legendary-era founding date with the `(legendary)` suffix", () => {
    const legendaryHouse: House = {
      ...targaryen,
      founded: { year: 0, era: "age-of-heroes", precision: "legendary" },
    };
    render(
      <HouseInfobox
        house={legendaryHouse}
        castlesBySlug={castlesBySlug}
        charactersBySlug={charactersBySlug}
        housesBySlug={housesBySlug}
        weaponsBySlug={new Map()}
        dragonsForHouse={[]}
      />,
    );
    expect(screen.getByText("Age Of Heroes (legendary)")).toBeDefined();
  });

  it("humanizes a non-legendary fantasy era without the suffix", () => {
    const fantasyHouse: House = {
      ...targaryen,
      founded: { year: 0, era: "andal-invasion", precision: "era" },
    };
    render(
      <HouseInfobox
        house={fantasyHouse}
        castlesBySlug={castlesBySlug}
        charactersBySlug={charactersBySlug}
        housesBySlug={housesBySlug}
        weaponsBySlug={new Map()}
        dragonsForHouse={[]}
      />,
    );
    expect(screen.getByText("Andal Invasion")).toBeDefined();
    expect(screen.queryByText(/legendary/i)).toBeNull();
  });

  it("renders a Rank row with the capitalized rank", () => {
    const lordlyHouse: House = { ...targaryen, rank: "lordly" };
    render(
      <HouseInfobox
        house={lordlyHouse}
        castlesBySlug={castlesBySlug}
        charactersBySlug={charactersBySlug}
        housesBySlug={housesBySlug}
        weaponsBySlug={new Map()}
        dragonsForHouse={[]}
      />,
    );
    expect(screen.getByText("Rank")).toBeDefined();
    expect(screen.getByText("Lordly")).toBeDefined();
  });

  it("renders a Provenance row with the capitalized sigil provenance", () => {
    const inventedSigil: House = {
      ...targaryen,
      sigil: { ...targaryen.sigil, provenance: "semi-canon" },
    };
    render(
      <HouseInfobox
        house={inventedSigil}
        castlesBySlug={castlesBySlug}
        charactersBySlug={charactersBySlug}
        housesBySlug={housesBySlug}
        weaponsBySlug={new Map()}
        dragonsForHouse={[]}
      />,
    );
    expect(screen.getByText("Provenance")).toBeDefined();
    expect(screen.getByText("Semi-canon")).toBeDefined();
  });

  it("renders an Extinct row when the house has an extinct date", () => {
    const extinctHouse: House = {
      ...targaryen,
      extinct: { year: 283, era: "AC", precision: "year" },
    };
    render(
      <HouseInfobox
        house={extinctHouse}
        castlesBySlug={castlesBySlug}
        charactersBySlug={charactersBySlug}
        housesBySlug={housesBySlug}
        weaponsBySlug={new Map()}
        dragonsForHouse={[]}
      />,
    );
    expect(screen.getByText("Extinct")).toBeDefined();
    expect(screen.getByText("283 AC")).toBeDefined();
  });
});
