import { describe, it, expect } from "vitest";
import { buildProseLinkIndex, type ProseLinkIndex } from "@/lib/prose-links";
import { renderMarkdown } from "@/lib/content";
import type { Character, House, Weapon, Dragon } from "@/lib/schemas";

type CharacterFixture = { slug: string; frontmatter: Character };
type HouseFixture = { slug: string; frontmatter: House };
type WeaponFixture = { slug: string; frontmatter: Weapon };
type DragonFixture = { slug: string; frontmatter: Dragon };

function character(
  partial: Partial<Character> & Pick<Character, "slug" | "name">,
): CharacterFixture {
  const fm: Character = {
    slug: partial.slug,
    name: partial.name,
    sex: partial.sex ?? null,
    born: partial.born ?? null,
    died: partial.died ?? null,
    "primary-house": partial["primary-house"] ?? null,
    "also-of-houses": partial["also-of-houses"] ?? [],
    parents: partial.parents ?? [],
    spouses: partial.spouses ?? [],
    children: partial.children ?? [],
    titles: partial.titles ?? [],
    aliases: partial.aliases ?? [],
    mentions: partial.mentions ?? [],
    placeholder: partial.placeholder ?? false,
    "placeholder-reason": partial["placeholder-reason"] ?? null,
    "exclude-from-tree": partial["exclude-from-tree"] ?? false,
    sources: partial.sources ?? [],
    draft: partial.draft ?? false,
  };
  return { slug: fm.slug, frontmatter: fm };
}

function house(
  partial: Partial<House> & Pick<House, "slug" | "name">,
): HouseFixture {
  const fm: House = {
    slug: partial.slug,
    name: partial.name,
    seat: partial.seat ?? "",
    liege: partial.liege ?? null,
    words: partial.words ?? "",
    sigil: partial.sigil ?? { description: "", provenance: "invented" },
    rank: partial.rank ?? "lordly",
    founded: partial.founded ?? { year: 0, era: "AC", precision: "era" },
    extinct: partial.extinct,
    status: partial.status ?? "extant",
    "sworn-from": partial["sworn-from"] ?? [],
    "cadet-houses": partial["cadet-houses"] ?? [],
    mentions: partial.mentions ?? [],
    region: partial.region,
    seats: partial.seats,
    heads: partial.heads,
    regions: partial.regions,
    titles: partial.titles,
    "ancestral-weapons": partial["ancestral-weapons"],
    sources: partial.sources ?? [],
    draft: partial.draft ?? false,
  };
  return { slug: fm.slug, frontmatter: fm };
}

const RICKARD = character({ slug: "rickard-stark", name: "Rickard Stark" });
const CATELYN = character({ slug: "catelyn-tully", name: "Catelyn Tully" });
const RHAEGAR = character({
  slug: "rhaegar-targaryen",
  name: "Rhaegar Targaryen",
});
const LYANNA = character({ slug: "lyanna-stark", name: "Lyanna Stark" });
const BRANDON = character({
  slug: "brandon-stark",
  name: "Brandon Stark",
  aliases: ["the Wild Wolf"],
});
const AERYS_II = character({
  slug: "aerys-ii-targaryen",
  name: "Aerys II Targaryen",
  aliases: ["Aerys II"],
});
const STARK = house({ slug: "stark", name: "House Stark" });
const TARGARYEN = house({ slug: "targaryen", name: "House Targaryen" });

function indexFor(args: {
  current: {
    kind: "character" | "house" | "weapon" | "dragon";
    slug: string;
    mentions?: readonly string[];
  };
  characters?: CharacterFixture[];
  houses?: HouseFixture[];
  weapons?: WeaponFixture[];
  dragons?: DragonFixture[];
}): ProseLinkIndex {
  return buildProseLinkIndex({
    allCharacters: args.characters ?? [
      RICKARD,
      CATELYN,
      RHAEGAR,
      LYANNA,
      BRANDON,
      AERYS_II,
    ],
    allHouses: args.houses ?? [STARK, TARGARYEN],
    allWeapons: args.weapons ?? [],
    allDragons: args.dragons ?? [],
    current: { ...args.current, mentions: args.current.mentions ?? [] },
  });
}

async function renderWith(
  source: string,
  index: ProseLinkIndex,
): Promise<string> {
  return renderMarkdown(source, { proseLinks: index });
}

describe("prose-links", () => {
  it("links a full character name in prose", async () => {
    const index = indexFor({
      current: { kind: "character", slug: "lyanna-stark" },
    });
    const html = await renderWith(
      "Betrothed to Catelyn Tully of Riverrun.",
      index,
    );
    expect(html).toContain(
      '<a href="/characters/catelyn-tully/">Catelyn Tully</a>',
    );
  });

  it("links an alias inside emphasis", async () => {
    const index = indexFor({
      current: { kind: "character", slug: "eddard-stark" },
    });
    const html = await renderWith(
      "Called *the Wild Wolf* for his temper.",
      index,
    );
    expect(html).toContain(
      '<a href="/characters/brandon-stark/">the Wild Wolf</a>',
    );
    expect(html).toMatch(/<em>.*<\/em>/);
  });

  it("does not first-name match when slug is absent from `mentions`", async () => {
    const index = indexFor({
      current: { kind: "character", slug: "eddard-stark" },
    });
    const html = await renderWith("Lord Rickard was burned alive.", index);
    expect(html).not.toContain('<a href="/characters/rickard-stark/">');
    expect(html).toContain("Lord Rickard");
  });

  it("first-name matches when slug is listed in `mentions`", async () => {
    const index = indexFor({
      current: {
        kind: "character",
        slug: "eddard-stark",
        mentions: ["rickard-stark"],
      },
    });
    const html = await renderWith("Lord Rickard was burned alive.", index);
    expect(html).toContain('<a href="/characters/rickard-stark/">Rickard</a>');
  });

  it("does not bare-house match when slug is absent from `mentions`", async () => {
    const index = indexFor({
      current: { kind: "character", slug: "eddard-stark" },
    });
    const html = await renderWith("Stark of Winterfell.", index);
    expect(html).not.toContain('<a href="/houses/stark/">');
  });

  it("bare-house matches when slug is listed in `mentions`", async () => {
    const index = indexFor({
      current: { kind: "character", slug: "eddard-stark", mentions: ["stark"] },
    });
    const html = await renderWith("Stark of Winterfell.", index);
    expect(html).toContain('<a href="/houses/stark/">Stark</a>');
  });

  it("matches longest surface form when forms overlap", async () => {
    const index = indexFor({
      current: { kind: "character", slug: "eddard-stark", mentions: ["stark"] },
    });
    const html = await renderWith("Brandon Stark rode south.", index);
    expect(html).toContain(
      '<a href="/characters/brandon-stark/">Brandon Stark</a>',
    );
    expect(html).not.toContain('<a href="/houses/stark/">Stark</a>');
  });

  it("links only the first occurrence per slug", async () => {
    const index = indexFor({
      current: { kind: "character", slug: "eddard-stark" },
    });
    const html = await renderWith(
      "Catelyn Tully wed Eddard. Catelyn Tully was Lady of Winterfell.",
      index,
    );
    const matches = html.match(/href="\/characters\/catelyn-tully\/"/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("suppresses self-links", async () => {
    const index = indexFor({
      current: { kind: "character", slug: "brandon-stark" },
    });
    const html = await renderWith("Brandon Stark was the Wild Wolf.", index);
    expect(html).not.toContain('<a href="/characters/brandon-stark/">');
  });

  it("skips matches inside existing links", async () => {
    const index = indexFor({
      current: { kind: "character", slug: "eddard-stark" },
    });
    const html = await renderWith(
      "See [Catelyn Tully here](https://example.com).",
      index,
    );
    expect(html).not.toContain('href="/characters/catelyn-tully/"');
    expect(html).toContain('href="https://example.com"');
  });

  it("skips matches inside code spans", async () => {
    const index = indexFor({
      current: { kind: "character", slug: "eddard-stark" },
    });
    const html = await renderWith(
      "The variable `Catelyn Tully` is reserved.",
      index,
    );
    expect(html).not.toContain('<a href="/characters/catelyn-tully/">');
    expect(html).toContain("<code>Catelyn Tully</code>");
  });

  it("skips matches inside headings", async () => {
    const index = indexFor({
      current: { kind: "character", slug: "eddard-stark" },
    });
    const html = await renderWith("# Catelyn Tully\n\nA paragraph.", index);
    expect(html).toContain("<h1>Catelyn Tully</h1>");
    expect(html).not.toContain('<a href="/characters/catelyn-tully/">');
  });

  it("handles possessive forms (Stark's) by matching only the bare name", async () => {
    const index = indexFor({
      current: { kind: "character", slug: "eddard-stark", mentions: ["stark"] },
    });
    const html = await renderWith("Stark's banner was raised.", index);
    expect(html).toContain('<a href="/houses/stark/">Stark</a>');
    expect(html).toContain("</a>'s banner");
  });

  it("ignores unknown slugs in `mentions`", async () => {
    const index = indexFor({
      current: {
        kind: "character",
        slug: "eddard-stark",
        mentions: ["rickard-stark", "made-up-slug", "another-fake"],
      },
    });
    const html = await renderWith("Lord Rickard rode south.", index);
    expect(html).toContain('<a href="/characters/rickard-stark/">Rickard</a>');
  });

  it('matches an alias like "Aerys II" as full surface form', async () => {
    const index = indexFor({
      current: { kind: "character", slug: "brandon-stark" },
    });
    const html = await renderWith("Put to death by Aerys II.", index);
    expect(html).toContain(
      '<a href="/characters/aerys-ii-targaryen/">Aerys II</a>',
    );
  });

  it("links Brandon’s example paragraph end-to-end", async () => {
    const index = indexFor({
      current: {
        kind: "character",
        slug: "brandon-stark",
        mentions: [
          "rickard-stark",
          "catelyn-tully",
          "rhaegar-targaryen",
          "lyanna-stark",
          "aerys-ii-targaryen",
        ],
      },
    });
    const source =
      "Eldest son of Lord Rickard and heir to Winterfell, called *the Wild Wolf* for his hot blood and quick temper. Betrothed to Catelyn Tully of Riverrun, though they never wed. Rode south to King's Landing in 282 AC to demand satisfaction of Prince Rhaegar for the abduction of his sister Lyanna; was arrested for threatening a prince of the blood and put to death alongside his father by Aerys II.";
    const html = await renderWith(source, index);
    expect(html).toContain('<a href="/characters/rickard-stark/">Rickard</a>');
    expect(html).toContain(
      '<a href="/characters/catelyn-tully/">Catelyn Tully</a>',
    );
    expect(html).toContain(
      '<a href="/characters/rhaegar-targaryen/">Rhaegar</a>',
    );
    expect(html).toContain('<a href="/characters/lyanna-stark/">Lyanna</a>');
    expect(html).toContain(
      '<a href="/characters/aerys-ii-targaryen/">Aerys II</a>',
    );
    expect(html).not.toContain('<a href="/characters/brandon-stark/">');
  });

  it("skips draft and placeholder characters", async () => {
    const draftChar = character({
      slug: "ghost-author",
      name: "Ghost Author",
      draft: true,
    });
    const placeholderChar = character({
      slug: "unknown-mother",
      name: "Unknown Mother",
      placeholder: true,
    });
    const index = indexFor({
      current: { kind: "character", slug: "eddard-stark" },
      characters: [draftChar, placeholderChar, RICKARD],
    });
    const html = await renderWith(
      "Rickard Stark, Ghost Author, and Unknown Mother walk in.",
      index,
    );
    expect(html).toContain(
      '<a href="/characters/rickard-stark/">Rickard Stark</a>',
    );
    expect(html).not.toContain('href="/characters/ghost-author/"');
    expect(html).not.toContain('href="/characters/unknown-mother/"');
  });
});

describe("buildProseLinkIndex", () => {
  it("emits a first-name form only when the slug is in `mentions`", () => {
    const out = buildProseLinkIndex({
      allCharacters: [RICKARD, CATELYN],
      allHouses: [],
      allWeapons: [],
      allDragons: [],
      current: { kind: "character", slug: "self", mentions: ["rickard-stark"] },
    });
    const rickard = out.targets.find((t) => t.slug === "rickard-stark");
    const catelyn = out.targets.find((t) => t.slug === "catelyn-tully");
    expect(rickard?.surfaceForms).toContain("Rickard");
    expect(rickard?.surfaceForms).toContain("Rickard Stark");
    expect(catelyn?.surfaceForms).not.toContain("Catelyn");
    expect(catelyn?.surfaceForms).toContain("Catelyn Tully");
  });

  it("emits a bare-house form only when the slug is in `mentions`", () => {
    const out = buildProseLinkIndex({
      allCharacters: [],
      allHouses: [STARK, TARGARYEN],
      allWeapons: [],
      allDragons: [],
      current: { kind: "house", slug: "self", mentions: ["stark"] },
    });
    const stark = out.targets.find((t) => t.slug === "stark");
    const targ = out.targets.find((t) => t.slug === "targaryen");
    expect(stark?.surfaceForms).toContain("Stark");
    expect(stark?.surfaceForms).toContain("House Stark");
    expect(targ?.surfaceForms).not.toContain("Targaryen");
    expect(targ?.surfaceForms).toContain("House Targaryen");
  });
});

const weaponBase: Weapon = {
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

const dragonBase: Dragon = {
  slug: "vhagar",
  name: "Vhagar",
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

describe("buildProseLinkIndex (weapons and dragons)", () => {
  it("emits weapon targets with `/weapons/<slug>/` hrefs", () => {
    const out = buildProseLinkIndex({
      allCharacters: [],
      allHouses: [],
      allWeapons: [{ slug: "blackfyre", frontmatter: weaponBase }],
      allDragons: [],
      current: { kind: "house", slug: "targaryen", mentions: [] },
    });
    const target = out.targets.find((t) => t.slug === "blackfyre");
    expect(target?.href).toBe("/weapons/blackfyre/");
    expect(target?.kind).toBe("weapon");
  });

  it("emits dragon targets with `/dragons/<slug>/` hrefs", () => {
    const out = buildProseLinkIndex({
      allCharacters: [],
      allHouses: [],
      allWeapons: [],
      allDragons: [{ slug: "vhagar", frontmatter: dragonBase }],
      current: { kind: "house", slug: "targaryen", mentions: [] },
    });
    const target = out.targets.find((t) => t.slug === "vhagar");
    expect(target?.href).toBe("/dragons/vhagar/");
    expect(target?.kind).toBe("dragon");
  });

  it("does not link a weapon to itself when current.kind=weapon", () => {
    const out = buildProseLinkIndex({
      allCharacters: [],
      allHouses: [],
      allWeapons: [{ slug: "blackfyre", frontmatter: weaponBase }],
      allDragons: [],
      current: { kind: "weapon", slug: "blackfyre", mentions: [] },
    });
    expect(out.selfSlug).toBe("blackfyre");
  });
});
