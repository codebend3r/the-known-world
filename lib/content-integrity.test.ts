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
import { CharacterSchema } from "@/lib/schemas";

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
});
