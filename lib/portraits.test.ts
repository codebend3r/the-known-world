import { describe, it, expect, spyOn, beforeEach, afterAll } from "bun:test";
import fs from "node:fs/promises";
import { findPortrait } from "@/lib/portraits";

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
    const result = await findPortrait("eddard-stark", "m");
    expect(result).toBe("/characters/eddard-stark.png");
  });

  it("prefers `.png` over `.webp`/`.jpg`/`.jpeg` when several exist", async () => {
    existing([
      `${process.cwd()}/public/characters/eddard-stark.png`,
      `${process.cwd()}/public/characters/eddard-stark.webp`,
      `${process.cwd()}/public/characters/eddard-stark.jpg`,
    ]);
    const result = await findPortrait("eddard-stark", "m");
    expect(result).toBe("/characters/eddard-stark.png");
  });

  it("falls through extensions in order: png → webp → jpg → jpeg", async () => {
    existing([`${process.cwd()}/public/characters/foo.jpeg`]);
    const result = await findPortrait("foo", "m");
    expect(result).toBe("/characters/foo.jpeg");
  });

  it("falls back to a numbered male placeholder when no portrait exists", async () => {
    existing([]);
    const result = await findPortrait("nobody", "m");
    expect(result).toMatch(/^\/characters\/unknown-male-0[1-5]\.jpg$/);
  });

  it("falls back to a numbered female placeholder when no portrait exists", async () => {
    existing([]);
    const result = await findPortrait("nobody", "f");
    expect(result).toMatch(/^\/characters\/unknown-female-0[1-5]\.jpg$/);
  });

  it("treats unknown sex as male for the placeholder", async () => {
    existing([]);
    const result = await findPortrait("nobody", null);
    expect(result).toMatch(/^\/characters\/unknown-male-0[1-5]\.jpg$/);
  });

  it("assigns the same placeholder variant for a given slug every time", async () => {
    existing([]);
    const first = await findPortrait("aelinor-penrose", "f");
    const second = await findPortrait("aelinor-penrose", "f");
    expect(second).toBe(first);
  });

  it("varies the placeholder variant across different slugs", async () => {
    existing([]);
    const slugs = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot"];
    const variants = new Set(
      await Promise.all(slugs.map((slug) => findPortrait(slug, "m"))),
    );
    expect(variants.size).toBeGreaterThan(1);
  });

  it("only ever assigns variants 01 through 05", async () => {
    existing([]);
    const slugs = Array.from({ length: 50 }, (_, index) => `slug-${index}`);
    const results = await Promise.all(
      slugs.map((slug) => findPortrait(slug, "f")),
    );
    results.forEach((result) =>
      expect(result).toMatch(/^\/characters\/unknown-female-0[1-5]\.jpg$/),
    );
  });
});
