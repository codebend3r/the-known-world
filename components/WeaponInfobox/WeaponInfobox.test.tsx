import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import { WeaponInfobox } from "@/components/WeaponInfobox";
import type { Weapon, House, Character } from "@/lib/schemas";

const blackfyre: Weapon = {
  slug: "blackfyre",
  name: "Blackfyre",
  type: "sword",
  material: "valyrian-steel",
  status: "lost",
  "origin-house": "targaryen",
  "current-house": null,
  wielders: ["aegon-i-targaryen", "daemon-i-blackfyre"],
  aliases: [],
  mentions: [],
  sources: [],
  draft: false,
};

const targaryen: House = {
  rank: "royal",
  slug: "targaryen",
  name: "House Targaryen",
  seat: "dragonstone",
  liege: null,
  words: "Fire and Blood",
  sigil: { description: "", provenance: "invented" },
  founded: { year: -114, era: "BC", precision: "year" },
  status: "exiled",
  "sworn-from": [],
  "cadet-houses": [],
  mentions: [],
  sources: [],
  draft: false,
};

const aegon: Character = {
  slug: "aegon-i-targaryen",
  name: "Aegon I Targaryen",
  sex: "m",
  born: { year: -27, era: "BC", precision: "year" },
  died: { year: 37, era: "AC", precision: "year" },
  "primary-house": "targaryen",
  "also-of-houses": [],
  parents: [],
  spouses: [],
  children: [],
  titles: [],
  aliases: [],
  mentions: [],
  placeholder: false,
  "placeholder-reason": null,
  "exclude-from-tree": false,
  sources: [],
  draft: false,
};

const housesBySlug = new Map<string, House>([["targaryen", targaryen]]);
const charactersBySlug = new Map<string, Character>([
  ["aegon-i-targaryen", aegon],
]);

describe("WeaponInfobox", () => {
  it("renders type, material, and status rows", () => {
    render(
      <WeaponInfobox
        weapon={blackfyre}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    expect(screen.getByText("Type")).toBeDefined();
    expect(screen.getByText("Material")).toBeDefined();
    expect(screen.getByText("Status")).toBeDefined();
  });

  it("links the origin house to its detail page", () => {
    render(
      <WeaponInfobox
        weapon={blackfyre}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    const link = screen.getByRole("link", { name: /house targaryen/i });
    expect(link.getAttribute("href")).toBe("/houses/targaryen/");
  });

  it("renders linkable wielders that exist in the characters map", () => {
    render(
      <WeaponInfobox
        weapon={blackfyre}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    const link = screen.getByRole("link", { name: /aegon i targaryen/i });
    expect(link.getAttribute("href")).toBe("/characters/aegon-i-targaryen/");
  });

  it("renders unknown wielders as plain text", () => {
    render(
      <WeaponInfobox
        weapon={blackfyre}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    expect(
      screen.queryByRole("link", { name: /daemon i blackfyre/i }),
    ).toBeNull();
    expect(screen.getByText("Daemon I Blackfyre")).toBeDefined();
  });

  it('shows "Lost" for the current-house row when null and status is lost', () => {
    render(
      <WeaponInfobox
        weapon={blackfyre}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    // Status row says "Lost" and Current house row says "Lost" — two matches.
    expect(screen.getAllByText("Lost")).toHaveLength(2);
  });

  it('shows "Destroyed" for the current-house row when null and status is destroyed', () => {
    const destroyed: Weapon = {
      ...blackfyre,
      status: "destroyed",
    };
    render(
      <WeaponInfobox
        weapon={destroyed}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    // Status row + Current house row both say "Destroyed".
    expect(screen.getAllByText("Destroyed")).toHaveLength(2);
  });

  it('shows a dash, not "Lost", for an extant weapon with no current house', () => {
    const houseless: Weapon = {
      ...blackfyre,
      status: "extant",
      "current-house": null,
    };
    render(
      <WeaponInfobox
        weapon={houseless}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    expect(screen.getByText("Current house")).toBeDefined();
    expect(screen.getByText("—")).toBeDefined();
    expect(screen.queryByText("Lost")).toBeNull();
  });

  it("links the current house to its detail page when set", () => {
    const inherited: Weapon = {
      ...blackfyre,
      "current-house": "targaryen",
    };
    render(
      <WeaponInfobox
        weapon={inherited}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    expect(screen.getByText("Current house")).toBeDefined();
    // Origin and current both link to House Targaryen → two links.
    const links = screen.getAllByRole("link", { name: /house targaryen/i });
    expect(links.length).toBeGreaterThanOrEqual(2);
    links.forEach((l) =>
      expect(l.getAttribute("href")).toBe("/houses/targaryen/"),
    );
  });

  it('renders a "Forged" row with a year+era for an AC/BC date', () => {
    const dated: Weapon = {
      ...blackfyre,
      forged: { year: 100, era: "BC", precision: "year" },
    };
    render(
      <WeaponInfobox
        weapon={dated}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    expect(screen.getByText("Forged")).toBeDefined();
    expect(screen.getByText("100 BC")).toBeDefined();
  });

  it("humanizes a legendary-era forging date with the `(legendary)` suffix", () => {
    const ancient: Weapon = {
      ...blackfyre,
      forged: { year: 0, era: "age-of-heroes", precision: "legendary" },
    };
    render(
      <WeaponInfobox
        weapon={ancient}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    expect(screen.getByText("Age Of Heroes (legendary)")).toBeDefined();
  });

  it("renders a Destroyed date row when the weapon has a destruction date", () => {
    const broken: Weapon = {
      ...blackfyre,
      status: "destroyed",
      destroyed: { year: 130, era: "AC", precision: "year" },
    };
    render(
      <WeaponInfobox
        weapon={broken}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    // "Destroyed" appears as the row label, the status value, and the
    // current-house value — three matches in total.
    expect(screen.getAllByText("Destroyed")).toHaveLength(3);
    expect(screen.getByText("130 AC")).toBeDefined();
  });
});
