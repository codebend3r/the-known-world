import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DragonInfobox } from "@/components/DragonInfobox";
import type { Dragon, House, Character } from "@/lib/schemas";

const targaryen: House = {
  rank: "royal",
  slug: "targaryen",
  name: "House Targaryen",
  seat: "dragonstone",
  liege: null,
  words: "Fire and Blood",
  sigil: { description: "" },
  founded: { year: -114, era: "BC", precision: "year" },
  status: "exiled",
  "sworn-from": [],
  "cadet-houses": [],
  mentions: [],
  sources: [],
  draft: false,
};

const vhagar: Dragon = {
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
  mentions: [],
  sources: [],
  draft: false,
};

const cannibal: Dragon = {
  slug: "cannibal",
  name: "The Cannibal",
  hatched: null,
  died: null,
  status: "wild",
  house: null,
  riders: [],
  aliases: [],
  mentions: [],
  sources: [],
  draft: false,
};

const housesBySlug = new Map<string, House>([["targaryen", targaryen]]);
const charactersBySlug = new Map<string, Character>();

describe("DragonInfobox", () => {
  it("renders the house link for a Targaryen dragon", () => {
    render(
      <DragonInfobox
        dragon={vhagar}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    const link = screen.getByRole("link", { name: /house targaryen/i });
    expect(link.getAttribute("href")).toBe("/houses/targaryen/");
  });

  it("renders the rider chain in order", () => {
    render(
      <DragonInfobox
        dragon={vhagar}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    expect(screen.getByText("Visenya Targaryen")).toBeDefined();
    expect(screen.getByText("Aemond Targaryen")).toBeDefined();
  });

  it('omits the house row and shows "Wild" for a wild dragon', () => {
    render(
      <DragonInfobox
        dragon={cannibal}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    // Status row says "Wild" and House row says "Wild" — two matches.
    expect(screen.getAllByText("Wild")).toHaveLength(2);
    expect(screen.queryByRole("link", { name: /house/i })).toBeNull();
  });

  it("suppresses the sigil for a wild dragon", () => {
    const { container } = render(
      <DragonInfobox
        dragon={cannibal}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    expect(container.querySelector(".sigil")).toBeNull();
  });

  it("humanizes a legendary-era hatched date with the `(legendary)` suffix", () => {
    const legendary: Dragon = {
      ...vhagar,
      hatched: { year: 0, era: "age-of-heroes", precision: "legendary" },
      died: null,
    };
    render(
      <DragonInfobox
        dragon={legendary}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    expect(screen.getByText("Age Of Heroes (legendary)")).toBeDefined();
  });

  it("humanizes a non-legendary fantasy era without the suffix", () => {
    const fantasy: Dragon = {
      ...vhagar,
      hatched: { year: 0, era: "andal-invasion", precision: "era" },
      died: null,
    };
    render(
      <DragonInfobox
        dragon={fantasy}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    expect(screen.getByText("Andal Invasion")).toBeDefined();
    expect(screen.queryByText(/legendary/i)).toBeNull();
  });

  it('falls back to a humanized "House X" label when the house slug is missing from the map', () => {
    const orphaned: Dragon = {
      ...vhagar,
      house: "unknown-house",
    };
    render(
      <DragonInfobox
        dragon={orphaned}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    expect(screen.getByText("House Unknown House")).toBeDefined();
    // No /houses/unknown-house/ link because the slug isn't in housesBySlug.
    expect(
      screen.queryByRole("link", { name: /house unknown house/i }),
    ).toBeNull();
  });
});
