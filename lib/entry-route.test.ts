import { describe, it, expect } from "bun:test";
import {
  entryMetadata,
  loadEntryOr404,
  publishedSlugParams,
} from "@/lib/entry-route";

const NOT_FOUND = "NEXT_HTTP_ERROR_FALLBACK;404";

type Entry = { frontmatter: { slug: string; draft: boolean; name: string } };

const STARK: Entry = {
  frontmatter: { slug: "stark", draft: false, name: "House Stark" },
};
const DRAFT: Entry = {
  frontmatter: { slug: "draft", draft: true, name: "House Draft" },
};

function missingFile(): Error {
  return Object.assign(new Error("ENOENT: no such file"), { code: "ENOENT" });
}

async function loadStark(slug: string): Promise<Entry> {
  if (slug === "stark") return STARK;
  throw missingFile();
}

async function loadBroken(): Promise<Entry> {
  throw new Error("frontmatter failed validation");
}

describe("publishedSlugParams", () => {
  it("lists every non-draft slug by default", async () => {
    await expect(
      publishedSlugParams({ loadAll: async () => [STARK, DRAFT] }),
    ).resolves.toEqual([{ slug: "stark" }]);
  });

  it("applies a custom listing rule", async () => {
    await expect(
      publishedSlugParams({
        loadAll: async () => [STARK, DRAFT],
        isListed: (entry) => entry.frontmatter.draft,
      }),
    ).resolves.toEqual([{ slug: "draft" }]);
  });
});

describe("loadEntryOr404", () => {
  it("resolves the loaded entry", async () => {
    await expect(
      loadEntryOr404({ load: loadStark, slug: "stark" }),
    ).resolves.toBe(STARK);
  });

  it("throws Next's not-found error when the file is missing", async () => {
    await expect(
      loadEntryOr404({ load: loadStark, slug: "tully" }),
    ).rejects.toThrow(NOT_FOUND);
  });

  it("rethrows any other failure", async () => {
    await expect(
      loadEntryOr404({ load: loadBroken, slug: "stark" }),
    ).rejects.toThrow("frontmatter failed validation");
  });
});

describe("entryMetadata", () => {
  const metadata = (entry: Entry) => ({ title: entry.frontmatter.name });

  it("builds metadata from the loaded entry", async () => {
    await expect(
      entryMetadata({
        params: Promise.resolve({ slug: "stark" }),
        load: loadStark,
        metadata,
      }),
    ).resolves.toEqual({ title: "House Stark" });
  });

  it("titles a missing entry 'Not found'", async () => {
    await expect(
      entryMetadata({
        params: Promise.resolve({ slug: "tully" }),
        load: loadStark,
        metadata,
      }),
    ).resolves.toEqual({ title: "Not found" });
  });

  it("rethrows any other failure", async () => {
    await expect(
      entryMetadata({
        params: Promise.resolve({ slug: "stark" }),
        load: loadBroken,
        metadata,
      }),
    ).rejects.toThrow("frontmatter failed validation");
  });
});
