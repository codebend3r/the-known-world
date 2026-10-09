import { describe, it, expect } from "bun:test";
import {
  loadCastle,
  loadAllCastles,
  renderMarkdown,
  loadAllWeapons,
  loadAllDragons,
  loadAllBattles,
  loadWeapon,
  loadDragon,
} from "@/lib/content";
import { absoluteYear } from "@/lib/battle-date";

describe("loadCastle", () => {
  it("loads Winterfell", async () => {
    const result = await loadCastle("winterfell");
    expect(result.frontmatter.slug).toBe("winterfell");
    expect(result.frontmatter.name).toBe("Winterfell");
    expect(result.body).toContain("Ancient seat");
  });

  it("throws on missing castle", async () => {
    await expect(loadCastle("does-not-exist")).rejects.toThrow();
  });
});

describe("frontmatter parsing", () => {
  it("parses every content collection through YAML", async () => {
    const collections = await Promise.all([
      loadAllCastles(),
      loadAllWeapons(),
      loadAllDragons(),
    ]);

    expect(collections.every((entries) => entries.length > 0)).toBe(true);
  });
});

describe("loadAllCastles", () => {
  it("returns Winterfell", async () => {
    const all = await loadAllCastles();
    const slugs = all.map((c) => c.frontmatter.slug);
    expect(slugs).toContain("winterfell");
  });
});

describe("renderMarkdown", () => {
  it("converts Markdown body to HTML", async () => {
    const html = await renderMarkdown({
      source: "# Hello\n\nA **bold** word.",
    });
    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("leaves prose unlinked when no `proseLinks` index is passed", async () => {
    const html = await renderMarkdown({ source: "Catelyn Tully of Riverrun." });
    expect(html).not.toContain("<a ");
  });

  it("rewrites matched surface forms when a `proseLinks` index is passed", async () => {
    const html = await renderMarkdown({
      source: "Catelyn Tully of Riverrun.",
      proseLinks: {
        targets: [
          {
            slug: "catelyn-tully",
            kind: "character",
            href: "/characters/catelyn-tully/",
            surfaceForms: ["Catelyn Tully"],
          },
        ],
        self: null,
      },
    });
    expect(html).toContain(
      '<a href="/characters/catelyn-tully/">Catelyn Tully</a>',
    );
  });
});

describe("loadAllWeapons", () => {
  it("returns an empty array when no weapons exist", async () => {
    const all = await loadAllWeapons();
    expect(Array.isArray(all)).toBe(true);
  });
});

describe("loadAllDragons", () => {
  it("returns an empty array when no dragons exist", async () => {
    const all = await loadAllDragons();
    expect(Array.isArray(all)).toBe(true);
  });
});

describe("loadWeapon", () => {
  it("throws when the weapon slug does not exist", async () => {
    await expect(loadWeapon("does-not-exist")).rejects.toThrow();
  });
});

describe("loadDragon", () => {
  it("throws when the dragon slug does not exist", async () => {
    await expect(loadDragon("does-not-exist")).rejects.toThrow();
  });
});

describe("loadWeapon round-trip", () => {
  it("loads Blackfyre with the canonical Valyrian-steel material", async () => {
    const result = await loadWeapon("blackfyre");
    expect(result.frontmatter.slug).toBe("blackfyre");
    expect(result.frontmatter.material).toBe("valyrian-steel");
    expect(result.frontmatter.status).toBe("lost");
  });

  it("lists Eddard among Ice's wielders", async () => {
    const result = await loadWeapon("ice");
    expect(result.frontmatter.wielders).toContain("eddard-stark");
  });
});

describe("loadAllWeapons round-trip", () => {
  it("returns every seeded weapon", async () => {
    const all = await loadAllWeapons();
    const slugs = all.map((w) => w.frontmatter.slug).toSorted();
    expect(slugs).toEqual([
      "blackfyre",
      "brightroar",
      "caggos-arakh",
      "catspaw-dagger",
      "dark-sister",
      "dawn",
      "dragonbinder",
      "eurons-daggers",
      "flaming-sword",
      "gregor-cleganes-greatsword",
      "hearteater",
      "heartsbane",
      "horn-of-winter",
      "ice",
      "lady-forlorn",
      "lamentation",
      "lightbringer",
      "lions-tooth",
      "longclaw",
      "needle",
      "nightfall",
      "oathkeeper",
      "orphan-maker",
      "red-rain",
      "roberts-warhammer",
      "sandoqs-blade",
      "the-just-maid",
      "truth",
      "vigilance",
      "widows-wail",
    ]);
  });
});

describe("loadDragon round-trip", () => {
  it("loads Balerion with monstrous size", async () => {
    const result = await loadDragon("balerion");
    expect(result.frontmatter.slug).toBe("balerion");
    expect(result.frontmatter.size).toBe("monstrous");
  });

  it("parses the Cannibal as a wild dragon (house null, status wild)", async () => {
    const result = await loadDragon("cannibal");
    expect(result.frontmatter.house).toBeNull();
    expect(result.frontmatter.status).toBe("wild");
  });
});

describe("loadAllDragons round-trip", () => {
  it("returns the seeded dragons", async () => {
    const all = await loadAllDragons();
    const slugs = all.map((d) => d.frontmatter.slug);
    expect(slugs).toEqual(
      expect.arrayContaining([
        "balerion",
        "cannibal",
        "caraxes",
        "meraxes",
        "sunfyre",
        "vermithor",
        "vhagar",
      ]),
    );
  });
});

describe("battles content corpus", () => {
  it("loads and validates every content/battles file against BattleSchema", async () => {
    const all = await loadAllBattles();
    expect(all.length).toBe(72);
  });

  it("keeps each file's frontmatter slug in sync with its filename", async () => {
    const all = await loadAllBattles();
    const mismatched = all.filter((b) => b.frontmatter.slug !== b.slug);
    expect(mismatched.map((b) => b.slug)).toEqual([]);
  });

  it("groups every battle under a war and publishes every populated entry", async () => {
    const all = await loadAllBattles();
    const missingWar = all.filter((b) => !b.frontmatter.war);
    const stillDraft = all.filter((b) => b.frontmatter.draft);
    expect(missingWar.map((b) => b.slug)).toEqual([]);
    expect(stillDraft.map((b) => b.slug)).toEqual([]);
  });

  it("gives every battle a populated prose body", async () => {
    const all = await loadAllBattles();
    const thin = all.filter((b) => b.body.trim().length < 200);
    expect(thin.map((b) => b.slug)).toEqual([]);
  });

  it("never ends a battle before it starts when both dates are exact", async () => {
    const all = await loadAllBattles();
    const reversed = all.filter((b) => {
      const { start, end } = b.frontmatter;
      if (start.precision !== "exact" || end.precision !== "exact")
        return false;
      return absoluteYear(end) < absoluteYear(start);
    });
    expect(reversed.map((b) => b.slug)).toEqual([]);
  });

  it("carries approximate (non-exact precision) dates for legendary battles", async () => {
    const all = await loadAllBattles();
    const approximate = all.filter(
      (b) => b.frontmatter.start.precision !== "exact",
    );
    expect(approximate.length).toBeGreaterThan(0);
  });
});
