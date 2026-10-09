import { describe, it, expect, spyOn, beforeEach, afterAll } from "bun:test";
import fs from "node:fs/promises";
import { findPortrait, findPortraitVideo } from "@/lib/portraits";

// `mock.module` would replace `node:fs/promises` wholesale; spying on the one
// method that matters leaves the rest of the module intact.
const access = spyOn(fs, "access");

afterAll(() => {
  access.mockRestore();
});

function existing(paths: string[]) {
  const set = new Set(paths);
  access.mockImplementation((p) => {
    return set.has(String(p))
      ? Promise.resolve()
      : Promise.reject(new Error("ENOENT"));
  });
}

describe("findPortrait", () => {
  beforeEach(() => {
    access.mockReset();
  });

  it("returns the `.png` path when only the png exists", async () => {
    existing([`${process.cwd()}/public/characters/eddard-stark.png`]);
    const result = await findPortrait({ slug: "eddard-stark", sex: "m" });
    expect(result).toBe("/characters/eddard-stark.png");
  });

  it("prefers `.png` over `.webp`/`.jpg`/`.jpeg` when several exist", async () => {
    existing([
      `${process.cwd()}/public/characters/eddard-stark.png`,
      `${process.cwd()}/public/characters/eddard-stark.webp`,
      `${process.cwd()}/public/characters/eddard-stark.jpg`,
    ]);
    const result = await findPortrait({ slug: "eddard-stark", sex: "m" });
    expect(result).toBe("/characters/eddard-stark.png");
  });

  it("falls through extensions in order: png → webp → jpg → jpeg", async () => {
    existing([`${process.cwd()}/public/characters/foo.jpeg`]);
    const result = await findPortrait({ slug: "foo", sex: "m" });
    expect(result).toBe("/characters/foo.jpeg");
  });

  it("resolves the primary inside a variant folder when no flat file exists", async () => {
    existing([
      `${process.cwd()}/public/characters/duncan-the-tall/duncan-the-tall.jpg`,
    ]);
    const result = await findPortrait({ slug: "duncan-the-tall", sex: "m" });
    expect(result).toBe("/characters/duncan-the-tall/duncan-the-tall.jpg");
  });

  it("prefers a flat file over the same extension in a variant folder", async () => {
    existing([
      `${process.cwd()}/public/characters/duncan-the-tall.jpg`,
      `${process.cwd()}/public/characters/duncan-the-tall/duncan-the-tall.jpg`,
    ]);
    const result = await findPortrait({ slug: "duncan-the-tall", sex: "m" });
    expect(result).toBe("/characters/duncan-the-tall.jpg");
  });

  it("falls back to a numbered male placeholder when no portrait exists", async () => {
    existing([]);
    const result = await findPortrait({ slug: "nobody", sex: "m" });
    expect(result).toMatch(/^\/characters\/unknown-male-0[1-5]\.jpg$/);
  });

  it("falls back to a numbered female placeholder when no portrait exists", async () => {
    existing([]);
    const result = await findPortrait({ slug: "nobody", sex: "f" });
    expect(result).toMatch(/^\/characters\/unknown-female-0[1-5]\.jpg$/);
  });

  it("treats unknown sex as male for the placeholder", async () => {
    existing([]);
    const result = await findPortrait({ slug: "nobody", sex: null });
    expect(result).toMatch(/^\/characters\/unknown-male-0[1-5]\.jpg$/);
  });

  it("assigns the same placeholder variant for a given slug every time", async () => {
    existing([]);
    const first = await findPortrait({ slug: "aelinor-penrose", sex: "f" });
    const second = await findPortrait({ slug: "aelinor-penrose", sex: "f" });
    expect(second).toBe(first);
  });

  it("varies the placeholder variant across different slugs", async () => {
    existing([]);
    const slugs = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot"];
    const variants = new Set(
      await Promise.all(slugs.map((slug) => findPortrait({ slug, sex: "m" }))),
    );
    expect(variants.size).toBeGreaterThan(1);
  });

  it("only ever assigns variants 01 through 05", async () => {
    existing([]);
    const slugs = Array.from({ length: 50 }, (_, index) => `slug-${index}`);
    const results = await Promise.all(
      slugs.map((slug) => findPortrait({ slug, sex: "f" })),
    );
    results.forEach((result) =>
      expect(result).toMatch(/^\/characters\/unknown-female-0[1-5]\.jpg$/),
    );
  });
});

describe("findPortraitVideo", () => {
  beforeEach(() => {
    access.mockReset();
  });

  it("returns the `.mp4` path when it exists", async () => {
    existing([`${process.cwd()}/public/characters/jon-snow.mp4`]);
    const result = await findPortraitVideo("jon-snow");
    expect(result).toBe("/characters/jon-snow.mp4");
  });

  it("returns the clip inside a variant folder when no flat clip exists", async () => {
    existing([
      `${process.cwd()}/public/characters/duncan-the-tall/duncan-the-tall.mp4`,
    ]);
    const result = await findPortraitVideo("duncan-the-tall");
    expect(result).toBe("/characters/duncan-the-tall/duncan-the-tall.mp4");
  });

  it("returns null when no video exists", async () => {
    existing([`${process.cwd()}/public/characters/jon-snow.jpg`]);
    const result = await findPortraitVideo("jon-snow");
    expect(result).toBeNull();
  });
});
