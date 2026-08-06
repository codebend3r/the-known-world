import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import { BattleInfobox } from "@/components/BattleInfobox";
import type { Battle, Character, House } from "@/lib/schemas";

const stark: House = {
  rank: "lordly",
  slug: "stark",
  name: "House Stark",
  seat: "winterfell",
  region: "north",
  liege: null,
  words: "Winter is Coming",
  sigil: { description: "A grey direwolf on white", provenance: "canon" },
  founded: { year: -8000, era: "BC", precision: "legendary" },
  status: "extant",
  "sworn-from": [],
  "cadet-houses": [],
  mentions: [],
  sources: [],
  draft: false,
};

const lannister: House = {
  ...stark,
  slug: "lannister",
  name: "House Lannister",
  seat: "casterly-rock",
  region: "westerlands",
  words: "Hear Me Roar!",
  sigil: { description: "A golden lion on crimson", provenance: "canon" },
};

const robb: Character = {
  slug: "robb-stark",
  name: "Robb Stark",
  sex: "m",
  born: { year: 283, era: "AC", precision: "year" },
  died: { year: 299, era: "AC", precision: "year" },
  "primary-house": "stark",
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

const jaime: Character = {
  ...robb,
  slug: "jaime-lannister",
  name: "Jaime Lannister",
};
const unwritten: Character = {
  ...robb,
  slug: "torrhen-karstark",
  name: "Torrhen Karstark",
  placeholder: true,
  "placeholder-reason": "unwritten",
};

const whisperingWood: Battle = {
  slug: "battle-of-the-whispering-wood",
  name: "Battle of the Whispering Wood",
  type: "battle",
  war: "War of the Five Kings",
  start: { year: 298, era: "AC", precision: "exact" },
  end: { year: 298, era: "AC", precision: "exact" },
  location: "the whispering wood",
  region: "riverlands",
  participants: [
    { side: "northmen", houses: ["stark"] },
    { side: "westermen", houses: ["lannister", "clegane"] },
  ],
  commanders: ["robb-stark", "jaime-lannister"],
  victor: "northmen",
  outcome: "Jaime Lannister taken captive.",
  casualties: ["torrhen-karstark"],
  aliases: ["Whispering Wood"],
  mentions: [],
  sources: [],
  draft: false,
};

const housesBySlug = new Map<string, House>([
  ["stark", stark],
  ["lannister", lannister],
]);

const charactersBySlug = new Map<string, Character>([
  ["robb-stark", robb],
  ["jaime-lannister", jaime],
  ["torrhen-karstark", unwritten],
]);

function renderBattle(battle: Battle = whisperingWood) {
  return render(
    <BattleInfobox
      battle={battle}
      housesBySlug={housesBySlug}
      charactersBySlug={charactersBySlug}
    />,
  );
}

describe("BattleInfobox", () => {
  it("captions the aside with the battle name", () => {
    renderBattle();
    const aside = screen.getByLabelText(
      "Battle of the Whispering Wood infobox",
    );
    expect(aside.tagName).toBe("ASIDE");
  });

  it("renders the human label for the battle type, not the raw slug", () => {
    renderBattle();
    expect(screen.getByText("Battle")).toBeDefined();
    expect(screen.queryByText("battle")).toBeNull();
  });

  it("names a naval engagement as a naval battle", () => {
    renderBattle({ ...whisperingWood, type: "naval" });
    expect(screen.getByText("Naval battle")).toBeDefined();
  });

  it("collapses a same-year span to a single exact year", () => {
    renderBattle();
    expect(screen.getByText("298 AC")).toBeDefined();
  });

  it("marks an approximate span with a trailing asterisk", () => {
    renderBattle({
      ...whisperingWood,
      start: { year: 298, era: "AC", precision: "year" },
      end: { year: 299, era: "AC", precision: "year" },
    });
    expect(screen.getByText("298 to 299 AC*")).toBeDefined();
  });

  it("title-cases the location, the victor, and each side label", () => {
    const { container } = renderBattle();
    expect(screen.getByText("The Whispering Wood")).toBeDefined();
    expect(container.querySelector(".victor")?.textContent).toBe("Northmen");
    const sides = [...container.querySelectorAll("dt")].map(
      (node) => node.textContent,
    );
    expect(sides).toContain("Northmen");
    expect(sides).toContain("Westermen");
  });

  it("renders one belligerent list per side, in declaration order", () => {
    const { container } = renderBattle();
    const lists = [...container.querySelectorAll(".belligerents")];
    expect(lists).toHaveLength(2);
    expect(lists[0]?.textContent).toBe("House Stark");
    expect(lists[1]?.textContent).toBe("House LannisterHouse Clegane");
  });

  it("links a belligerent that has a house entry and leaves the rest as text", () => {
    renderBattle();
    expect(
      screen
        .getByRole("link", { name: "House Lannister" })
        .getAttribute("href"),
    ).toBe("/houses/lannister/");
    // `clegane` is not in `housesBySlug`, so it is humanized but not linked.
    expect(screen.getByText("House Clegane")).toBeDefined();
    expect(screen.queryByRole("link", { name: "House Clegane" })).toBeNull();
  });

  it("tints each belligerent swatch with its house's region", () => {
    const { container } = renderBattle();
    const swatches = [...container.querySelectorAll(".swatch")];
    expect(swatches[0]?.getAttribute("style")).toContain(
      "--house-tint: var(--region-color-north)",
    );
    expect(swatches[1]?.getAttribute("style")).toContain(
      "--house-tint: var(--region-color-westerlands)",
    );
    // No region resolves for `clegane`, so no tint is set.
    expect(swatches[2]?.getAttribute("style") ?? "").not.toContain(
      "--house-tint",
    );
  });

  it("singularizes the commander label for a lone commander", () => {
    renderBattle({ ...whisperingWood, commanders: ["robb-stark"] });
    expect(screen.getByText("Commander")).toBeDefined();
    expect(screen.queryByText("Commanders")).toBeNull();
  });

  it("pluralizes the commander label for more than one", () => {
    renderBattle();
    expect(screen.getByText("Commanders")).toBeDefined();
  });

  it("links a written commander and not a placeholder one", () => {
    renderBattle();
    expect(
      screen.getByRole("link", { name: "Robb Stark" }).getAttribute("href"),
    ).toBe("/characters/robb-stark/");
    expect(screen.getByText("Torrhen Karstark")).toBeDefined();
    expect(screen.queryByRole("link", { name: "Torrhen Karstark" })).toBeNull();
  });

  it("humanizes a commander slug that has no character entry", () => {
    renderBattle({ ...whisperingWood, commanders: ["ser-nobody-of-nowhere"] });
    expect(screen.getByText("Ser Nobody Of Nowhere")).toBeDefined();
  });

  it("omits the optional rows a battle does not carry", () => {
    renderBattle({
      ...whisperingWood,
      war: undefined,
      location: undefined,
      victor: undefined,
      outcome: undefined,
      aliases: [],
      casualties: [],
    });
    expect(screen.queryByText("Conflict")).toBeNull();
    expect(screen.queryByText("Location")).toBeNull();
    expect(screen.queryByText("Victor")).toBeNull();
    expect(screen.queryByText("Outcome")).toBeNull();
    expect(screen.queryByText("Also called")).toBeNull();
    expect(screen.queryByText("Fallen")).toBeNull();
    // The unconditional rows survive.
    expect(screen.getByText("Type")).toBeDefined();
    expect(screen.getByText("When")).toBeDefined();
  });
});
