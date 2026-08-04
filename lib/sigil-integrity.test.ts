import { describe, expect, it } from "bun:test";
import { loadAllCharacters, loadAllHouses } from "@/lib/content";
import { SIGIL_SLUGS } from "@/lib/sigil";
import {
  loadSigilImages,
  reachableSigilFiles,
  sigilIntegrityErrors,
} from "@/lib/sigil-integrity";

async function loadSigilSources() {
  const [images, houses, characters] = await Promise.all([
    loadSigilImages(),
    loadAllHouses(),
    loadAllCharacters(),
  ]);
  return {
    images,
    houseSlugs: new Set(houses.map((entry) => entry.frontmatter.slug)),
    characterSlugs: new Set(characters.map((entry) => entry.frontmatter.slug)),
  };
}

describe("sigil integrity", () => {
  it("resolves every sigil image and every registered slug", async () => {
    expect(sigilIntegrityErrors(await loadSigilSources())).toEqual([]);
  });

  it("ignores images reserved for future use", async () => {
    const sources = await loadSigilSources();
    expect(sources.images.has("unknown-essos")).toBe(true);
    expect(reachableSigilFiles().has("unknown-essos")).toBe(false);
    expect(sigilIntegrityErrors(sources)).toEqual([]);
  });

  it("flags an image nothing resolves to", async () => {
    const sources = await loadSigilSources();
    expect(
      sigilIntegrityErrors({
        ...sources,
        images: new Set([...sources.images, "ghost-sigil"]),
      }),
    ).toEqual([
      "sigils/ghost-sigil.png: unreferenced, and no house or character entry uses this slug",
    ]);
  });

  it("flags a house image whose slug is missing from SIGIL_SLUGS", async () => {
    const sources = await loadSigilSources();
    const unregistered = [...sources.houseSlugs].find(
      (slug) => !SIGIL_SLUGS.has(slug),
    );
    if (!unregistered) throw new Error("expected an unregistered house slug");

    expect(
      sigilIntegrityErrors({
        ...sources,
        images: new Set([...sources.images, unregistered]),
      }),
    ).toEqual([
      `sigils/${unregistered}.png: houses/${unregistered} exists, but the slug is missing from SIGIL_SLUGS`,
    ]);
  });

  it("flags a reachable file with no image on disk", async () => {
    const sources = await loadSigilSources();
    const [file] = [...reachableSigilFiles().keys()].sort();
    if (!file) throw new Error("expected at least one reachable sigil file");

    const errors = sigilIntegrityErrors({
      ...sources,
      images: new Set([...sources.images].filter((image) => image !== file)),
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(`sigils/${file}.png: missing, required by`);
  });

  it("flags a registered slug with no house or character entry", async () => {
    const sources = await loadSigilSources();
    const backedByHouseOnly = [...SIGIL_SLUGS].find(
      (slug) =>
        sources.houseSlugs.has(slug) && !sources.characterSlugs.has(slug),
    );
    if (!backedByHouseOnly) throw new Error("expected a house-backed slug");

    expect(
      sigilIntegrityErrors({
        ...sources,
        houseSlugs: new Set(
          [...sources.houseSlugs].filter((slug) => slug !== backedByHouseOnly),
        ),
      }),
    ).toEqual([
      `SIGIL_SLUGS ${backedByHouseOnly}: no houses/${backedByHouseOnly} or characters/${backedByHouseOnly} entry`,
    ]);
  });
});
