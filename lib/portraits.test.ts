import { describe, it, expect, vi, beforeEach } from "vitest";
import { findPortrait } from "@/lib/portraits";

vi.mock("node:fs/promises", () => ({
  default: { access: vi.fn() },
}));

const fs = await import("node:fs/promises");
const access = fs.default.access as ReturnType<typeof vi.fn>;

function existing(paths: string[]) {
  const set = new Set(paths);
  access.mockImplementation((p: string) => {
    return set.has(p) ? Promise.resolve() : Promise.reject(new Error("ENOENT"));
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

  it("returns the male fallback when no extension matches for a male character", async () => {
    existing([]);
    const result = await findPortrait("nobody", "m");
    expect(result).toBe("/characters/unknown-male.png");
  });

  it("returns the female fallback when no extension matches for a female character", async () => {
    existing([]);
    const result = await findPortrait("nobody", "f");
    expect(result).toBe("/characters/unknown-female.png");
  });

  it("returns the male fallback when sex is unknown", async () => {
    existing([]);
    const result = await findPortrait("nobody", null);
    expect(result).toBe("/characters/unknown-male.png");
  });
});
