import { afterEach, describe, expect, it, jest } from "bun:test";
import {
  buildCharacterSearchIndex,
  buildHouseSearchIndex,
  fetchSearchIndex,
} from "@/lib/search-index";
import { CharacterSchema, HouseSchema } from "@/lib/schemas";
import { stubGlobal, unstubAllGlobals } from "@/test/stubs";

function character(frontmatter: Record<string, unknown>) {
  return CharacterSchema.parse({
    born: null,
    died: null,
    "primary-house": null,
    ...frontmatter,
  });
}

function house(frontmatter: Record<string, unknown>) {
  const parsed = HouseSchema.parse({
    seat: null,
    liege: null,
    words: "",
    sigil: { description: "", provenance: "invented" },
    rank: "lordly",
    status: "extant",
    founded: { year: 0, era: "AC", precision: "year" },
    ...frontmatter,
  });
  return { frontmatter: parsed, slug: parsed.slug };
}

describe("buildCharacterSearchIndex", () => {
  it("hangs the first alias beside the name and keeps every alias for ranking", () => {
    const index = buildCharacterSearchIndex({
      characters: [
        character({
          slug: "aemon-the-dragonknight",
          name: "Aemon Targaryen",
          aliases: ["The Dragonknight", "Prince Aemon"],
        }),
        character({ slug: "naerys-targaryen", name: "Naerys Targaryen" }),
      ],
    });
    expect(index).toEqual([
      {
        slug: "aemon-the-dragonknight",
        name: "Aemon Targaryen",
        detail: "The Dragonknight",
        aliases: ["The Dragonknight", "Prince Aemon"],
      },
      {
        slug: "naerys-targaryen",
        name: "Naerys Targaryen",
        detail: null,
        aliases: [],
      },
    ]);
  });

  it("leaves out drafts and placeholders", () => {
    const index = buildCharacterSearchIndex({
      characters: [
        character({ slug: "draft", name: "Draft", draft: true }),
        character({ slug: "stub", name: "Stub", placeholder: true }),
        character({ slug: "kept", name: "Kept" }),
      ],
    });
    expect(index.map((item) => item.slug)).toEqual(["kept"]);
  });
});

describe("buildHouseSearchIndex", () => {
  it("shortens names, resolves the region through the liege, and sorts", () => {
    const index = buildHouseSearchIndex({
      houses: [
        house({ slug: "stark", name: "House Stark" }),
        house({ slug: "karstark", name: "House Karstark", liege: "stark" }),
        house({ slug: "manwoody", name: "House Manwoody" }),
      ],
    });
    expect(index).toEqual([
      { slug: "karstark", name: "Karstark", detail: "The North", aliases: [] },
      { slug: "manwoody", name: "Manwoody", detail: null, aliases: [] },
      { slug: "stark", name: "Stark", detail: "The North", aliases: [] },
    ]);
  });

  it("leaves out drafts", () => {
    const index = buildHouseSearchIndex({
      houses: [
        house({ slug: "drafted", name: "House Drafted", draft: true }),
        house({ slug: "kept", name: "House Kept" }),
      ],
    });
    expect(index.map((item) => item.slug)).toEqual(["kept"]);
  });
});

describe("fetchSearchIndex", () => {
  afterEach(() => {
    unstubAllGlobals();
  });

  const item = { slug: "stark", name: "Stark", detail: null, aliases: [] };

  it("returns the validated index", async () => {
    stubGlobal({ name: "fetch", value: async () => Response.json([item]) });
    expect(await fetchSearchIndex("/index/valid.json")).toEqual([item]);
  });

  it("shares one request between callers of the same index", async () => {
    const fetchIndex = jest.fn(async () => Response.json([item]));
    stubGlobal({ name: "fetch", value: fetchIndex });
    await Promise.all([
      fetchSearchIndex("/index/shared.json"),
      fetchSearchIndex("/index/shared.json"),
    ]);
    await fetchSearchIndex("/index/shared.json");
    expect(fetchIndex).toHaveBeenCalledTimes(1);
  });

  it("rejects a response that is not an index", async () => {
    stubGlobal({
      name: "fetch",
      value: async () => Response.json([{ slug: "stark" }]),
    });
    await expect(fetchSearchIndex("/index/malformed.json")).rejects.toThrow();
  });

  it("rejects a failed response and retries on the next call", async () => {
    stubGlobal({
      name: "fetch",
      value: async () => new Response("missing", { status: 404 }),
    });
    await expect(fetchSearchIndex("/index/retry.json")).rejects.toThrow(
      "Search index /index/retry.json responded 404",
    );

    stubGlobal({ name: "fetch", value: async () => Response.json([item]) });
    expect(await fetchSearchIndex("/index/retry.json")).toEqual([item]);
  });
});
