import { describe, it, expect } from "vitest";
import {
  loadCastle,
  loadAllCastles,
  renderMarkdown,
  loadAllWeapons,
  loadAllDragons,
  loadWeapon,
  loadDragon,
} from "@/lib/content";

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

describe("loadAllCastles", () => {
  it("returns Winterfell", async () => {
    const all = await loadAllCastles();
    const slugs = all.map((c) => c.frontmatter.slug);
    expect(slugs).toContain("winterfell");
  });
});

describe("loadAll caching", () => {
  it("returns the same cached result for repeated calls", async () => {
    const first = await loadAllCastles();
    const second = await loadAllCastles();
    expect(second).toBe(first);
  });
});

describe("renderMarkdown", () => {
  it("converts Markdown body to HTML", async () => {
    const html = await renderMarkdown("# Hello\n\nA **bold** word.");
    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("leaves prose unlinked when no `proseLinks` index is passed", async () => {
    const html = await renderMarkdown("Catelyn Tully of Riverrun.");
    expect(html).not.toContain("<a ");
  });

  it("rewrites matched surface forms when a `proseLinks` index is passed", async () => {
    const html = await renderMarkdown("Catelyn Tully of Riverrun.", {
      proseLinks: {
        targets: [
          {
            slug: "catelyn-tully",
            kind: "character",
            href: "/characters/catelyn-tully/",
            surfaceForms: ["Catelyn Tully"],
          },
        ],
        selfSlug: null,
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
    const slugs = all.map((w) => w.frontmatter.slug).sort();
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
  it("returns all seven seeded dragons", async () => {
    const all = await loadAllDragons();
    const slugs = all.map((d) => d.frontmatter.slug).sort();
    expect(slugs).toEqual([
      "balerion",
      "cannibal",
      "caraxes",
      "meraxes",
      "sunfyre",
      "vermithor",
      "vhagar",
    ]);
  });
});
